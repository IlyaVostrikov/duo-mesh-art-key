import type { SubscriptionSnapshot } from '@web-app-demo/contracts';
import {
  deepLinkToSubscriptions,
  getAvailablePurchases as getAvailablePurchasesFromStore,
  useIAP,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { ApiRequestError } from './api';
import { useAuth } from './auth';
import { trackIapDiagnostic } from './iap-diagnostics';
import {
  buildReconcilePayloadFromPurchases,
  buildSubscriptionPurchaseRequest,
  friendlyIapErrorMessage,
  getIapErrorCode,
  ingestAndFinishPurchase,
  isPostSuccessNoiseError,
  isRetryableIapError,
  isUserCancelledPurchaseError,
  retryIapOperation,
  sortProductsByConfiguredOrder,
  validateAppStorePurchaseForIngest,
} from './iap-utils';

const iosProductIds = [
  process.env.EXPO_PUBLIC_IAP_IOS_MONTHLY_PRODUCT_ID,
  process.env.EXPO_PUBLIC_IAP_IOS_YEARLY_PRODUCT_ID,
]
  .map((productId) => productId?.trim())
  .filter((productId): productId is string => Boolean(productId));

type SubscriptionContextValue = {
  error: string | null;
  isConnected: boolean;
  isLoadingProducts: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  isSupported: boolean;
  isSyncing: boolean;
  platform: typeof Platform.OS;
  productIds: string[];
  products: ProductSubscription[];
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
  manageSubscriptions: () => Promise<void>;
  selectedProductId: string | null;
  setSelectedProductId: (productId: string) => void;
  subscription: SubscriptionSnapshot | null;
  sync: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function IapProvider({ children }: PropsWithChildren) {
  const auth = useAuth();

  if (!auth.user || Platform.OS !== 'ios') {
    return (
      <SubscriptionContext.Provider value={unsupportedSubscriptionValue(auth.user?.subscription ?? null)}>
        {children}
      </SubscriptionContext.Provider>
    );
  }

  return <IosIapProvider>{children}</IosIapProvider>;
}

function IosIapProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { api, setSubscription } = auth;
  const user = auth.user;
  const userId = user?.id ?? null;
  const [selectedProductId, setSelectedProductId] = useState<string | null>(iosProductIds[0] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const iapRef = useRef<ReturnType<typeof useIAP> | null>(null);
  const inFlightReconcileKeysRef = useRef(new Set<string>());
  const processingTransactionsRef = useRef(new Set<string>());
  const processedTransactionsRef = useRef(new Set<string>());
  const lastPurchaseSuccessAtRef = useRef<number | null>(null);

  const handlePurchase = useCallback(
    async (purchase: Purchase) => {
      if (!user) return;

      const validation = validateAppStorePurchaseForIngest(purchase);
      if (!validation.ok) {
        if (!validation.pending) {
          reportIapDiagnostic('purchase-invalid', validation.message);
        }
        setError(validation.message);
        setIsPurchasing(false);
        return;
      }

      if (
        processedTransactionsRef.current.has(validation.transactionKey) ||
        processingTransactionsRef.current.has(validation.transactionKey)
      ) {
        return;
      }

      processingTransactionsRef.current.add(validation.transactionKey);
      setIsPurchasing(true);
      setError(null);

      try {
        const subscription = await ingestAndFinishPurchase({
          purchase,
          signedTransactionInfo: validation.signedTransactionInfo,
          ingest: (request) => api.ingestAppStoreTransaction(request),
          finish: (nextPurchase) => {
            if (!iapRef.current) {
              throw new Error('Store connection is not ready.');
            }
            return iapRef.current.finishTransaction({ purchase: nextPurchase, isConsumable: false });
          },
        });
        processedTransactionsRef.current.add(validation.transactionKey);
        lastPurchaseSuccessAtRef.current = Date.now();
        setSubscription(subscription);
      } catch (caughtError) {
        reportIapDiagnostic('purchase-ingest-error', caughtError);
        setError(messageForIapError(caughtError));
      } finally {
        processingTransactionsRef.current.delete(validation.transactionKey);
        setIsPurchasing(false);
      }
    },
    [api, setSubscription, user],
  );

  const iap = useIAP({
    onPurchaseSuccess: (purchase) => {
      void handlePurchase(purchase);
    },
    onPurchaseError: (purchaseError) => {
      setIsPurchasing(false);
      if (!isUserCancelledPurchaseError(purchaseError)) {
        if (shouldSuppressPostSuccessError(purchaseError, lastPurchaseSuccessAtRef.current)) {
          return;
        }
        reportIapDiagnostic('purchase-error', purchaseError);
        setError(messageForIapError(purchaseError));
      }
    },
    onError: (caughtError) => {
      if (isUserCancelledPurchaseError(caughtError)) {
        return;
      }
      reportIapDiagnostic('iap-error', caughtError);
      setError(messageForIapError(caughtError));
    },
  });
  iapRef.current = iap;
  const {
    connected,
    fetchProducts,
    requestPurchase,
    restorePurchases,
    subscriptions,
  } = iap;

  const loadProducts = useCallback(async () => {
    if (iosProductIds.length === 0) {
      setError('Subscription product IDs are not configured.');
      return;
    }

    setIsLoadingProducts(true);
    setError(null);

    try {
      await retryIapOperation(() => fetchProducts({ skus: iosProductIds, type: 'subs' }));
    } catch (caughtError) {
      reportIapDiagnostic('product-fetch-error', caughtError);
      setError(messageForIapError(caughtError));
    } finally {
      setIsLoadingProducts(false);
    }
  }, [fetchProducts]);

  const reconcileAndFinishPurchases = useCallback(
    async ({
      finishPurchases,
      originalTransactionIds,
      purchases,
    }: {
      finishPurchases: boolean;
      originalTransactionIds?: string[];
      purchases: Purchase[];
    }) => {
      const payload = buildReconcilePayloadFromPurchases(purchases, originalTransactionIds);
      if (!payload) return null;

      const reconcileKey = [
        ...(payload.signedTransactions ?? []).map((transaction) => `signed:${transaction}`),
        ...(payload.originalTransactionIds ?? []).map((transactionId) => `original:${transactionId}`),
      ].join('|');
      const purchasesToFinish = finishPurchases
        ? purchases.filter((purchase) => {
            const validation = validateAppStorePurchaseForIngest(purchase);
            return (
              validation.ok &&
              !processedTransactionsRef.current.has(validation.transactionKey) &&
              !processingTransactionsRef.current.has(validation.transactionKey)
            );
          })
        : [];

      if (inFlightReconcileKeysRef.current.has(reconcileKey)) {
        return null;
      }

      inFlightReconcileKeysRef.current.add(reconcileKey);

      try {
        const response = await api.reconcileAppStoreTransactions(payload);
        setSubscription(response.subscription);

        if (finishPurchases) {
          for (const purchase of purchasesToFinish) {
            const validation = validateAppStorePurchaseForIngest(purchase);
            if (!validation.ok) {
              continue;
            }

            if (!iapRef.current) {
              throw new Error('Store connection is not ready.');
            }

            await retryIapOperation(() =>
              iapRef.current!.finishTransaction({ purchase, isConsumable: false }),
            );
            processedTransactionsRef.current.add(validation.transactionKey);
          }
        }

        return response.subscription;
      } finally {
        inFlightReconcileKeysRef.current.delete(reconcileKey);
      }
    },
    [api, setSubscription],
  );

  const sync = useCallback(async () => {
    if (!userId) return;

    setIsSyncing(true);

    try {
      const entitlement = await api.iapEntitlement();
      setSubscription(entitlement.subscription);

      if (connected) {
        const purchases = await retryIapOperation(() =>
          getAvailablePurchasesFromStore({
            alsoPublishToEventListenerIOS: false,
            onlyIncludeActiveItemsIOS: true,
          }),
        );
        await reconcileAndFinishPurchases({
          finishPurchases: true,
          originalTransactionIds: entitlement.subscription.originalTransactionId
            ? [entitlement.subscription.originalTransactionId]
            : undefined,
          purchases,
        });
      }
    } catch (caughtError) {
      reportIapDiagnostic('subscription-sync-error', caughtError);
      setError(messageForIapError(caughtError));
    } finally {
      setIsSyncing(false);
    }
  }, [api, connected, reconcileAndFinishPurchases, setSubscription, userId]);

  const purchase = useCallback(async () => {
    if (!user || !selectedProductId) return;

    if (!connected) {
      setError('App Store connection is not ready yet. Please try again in a moment.');
      return;
    }

    const selectedProduct = subscriptions.find((product) => product.id === selectedProductId);
    if (!selectedProduct) {
      setError('Selected subscription is not available in the App Store yet.');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      await requestPurchase(buildSubscriptionPurchaseRequest(selectedProduct.id, user.id));
      if (processingTransactionsRef.current.size === 0) {
        setIsPurchasing(false);
      }
    } catch (caughtError) {
      setIsPurchasing(false);
      if (!isUserCancelledPurchaseError(caughtError)) {
        reportIapDiagnostic('purchase-request-error', caughtError);
        setError(messageForIapError(caughtError));
      }
    }
  }, [connected, requestPurchase, selectedProductId, subscriptions, user]);

  const restore = useCallback(async () => {
    if (!user) return;

    if (!connected) {
      setError('App Store connection is not ready yet. Please try again in a moment.');
      return;
    }

    setIsRestoring(true);
    setError(null);

    try {
      let restoreError: unknown = null;
      let restoreCancelled = false;
      await restorePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      }).catch((caughtError) => {
        if (isUserCancelledPurchaseError(caughtError)) {
          restoreCancelled = true;
          return;
        }
        restoreError = caughtError;
        reportIapDiagnostic('storekit-restore-sync-error', caughtError);
      });
      if (restoreCancelled) return;
      const purchases = await retryIapOperation(() =>
        getAvailablePurchasesFromStore({
          alsoPublishToEventListenerIOS: false,
          onlyIncludeActiveItemsIOS: true,
        }),
      );
      const subscription = await reconcileAndFinishPurchases({
        finishPurchases: true,
        originalTransactionIds: user.subscription.originalTransactionId
          ? [user.subscription.originalTransactionId]
          : undefined,
        purchases,
      });

      if (restoreError && purchases.length === 0 && !subscription?.isActive) {
        setError(messageForIapError(restoreError));
      } else if (!subscription && purchases.length === 0) {
        setError(
          restoreError
            ? messageForIapError(restoreError)
            : user.subscription.originalTransactionId
              ? 'Apple did not return an active subscription for this account. Please try again.'
              : 'No restorable App Store subscription was found for this account.',
        );
      }
    } catch (caughtError) {
      reportIapDiagnostic('restore-error', caughtError);
      setError(messageForIapError(caughtError));
    } finally {
      setIsRestoring(false);
    }
  }, [connected, reconcileAndFinishPurchases, restorePurchases, user]);

  const manageSubscriptions = useCallback(async () => {
    try {
      await deepLinkToSubscriptions({});
    } catch (caughtError) {
      setError(messageForIapError(caughtError));
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    void loadProducts();
    void sync();
  }, [connected, loadProducts, sync]);

  useEffect(() => {
    if (subscriptions.length === 0) return;

    const orderedSubscriptions = sortProductsByConfiguredOrder(subscriptions, iosProductIds);
    if (!selectedProductId || !orderedSubscriptions.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(orderedSubscriptions[0]?.id ?? null);
    }
  }, [subscriptions, selectedProductId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void sync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [sync]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      error,
      isConnected: connected,
      isLoadingProducts,
      isPurchasing,
      isRestoring,
      isSupported: true,
      isSyncing,
      platform: Platform.OS,
      productIds: iosProductIds,
      products: sortProductsByConfiguredOrder(subscriptions, iosProductIds),
      purchase,
      restore,
      manageSubscriptions,
      selectedProductId,
      setSelectedProductId,
      subscription: user?.subscription ?? null,
      sync,
    }),
    [
      error,
      connected,
      isLoadingProducts,
      isPurchasing,
      isRestoring,
      isSyncing,
      manageSubscriptions,
      purchase,
      restore,
      selectedProductId,
      sync,
      user?.subscription,
      subscriptions,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionIap() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionIap must be used inside IapProvider');
  }

  return context;
}

function unsupportedSubscriptionValue(subscription: SubscriptionSnapshot | null): SubscriptionContextValue {
  return {
    error: null,
    isConnected: false,
    isLoadingProducts: false,
    isPurchasing: false,
    isRestoring: false,
    isSupported: false,
    isSyncing: false,
    platform: Platform.OS,
    productIds: [],
    products: [],
    purchase: async () => undefined,
    restore: async () => undefined,
    manageSubscriptions: async () => undefined,
    selectedProductId: null,
    setSelectedProductId: () => undefined,
    subscription,
    sync: async () => undefined,
  };
}

function messageForIapError(error: unknown) {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case 'IAP_NOT_CONFIGURED':
        return 'Subscriptions are not configured on the server yet.';
      case 'IAP_INVALID_TRANSACTION':
        return 'The App Store transaction could not be verified. Use Restore purchases or try again.';
      case 'IAP_OWNERSHIP_MISMATCH':
        return 'This App Store purchase is linked to another account.';
      default:
        return error.message;
    }
  }

  return friendlyIapErrorMessage(error);
}

function shouldSuppressPostSuccessError(error: unknown, lastPurchaseSuccessAt: number | null) {
  return (
    Boolean(lastPurchaseSuccessAt) &&
    isPostSuccessNoiseError(error) &&
    Date.now() - Number(lastPurchaseSuccessAt) < 5_000
  );
}

function reportIapDiagnostic(event: string, error: unknown) {
  const code = getIapErrorCode(error);
  const retryable = isRetryableIapError(error);
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
  trackIapDiagnostic(event, {
    code,
    retryable,
    message,
  });
}
