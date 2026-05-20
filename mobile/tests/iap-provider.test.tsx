import type { SubscriptionSnapshot } from '@web-app-demo/contracts';
import { expect, mock, beforeEach, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type FakeElement = FakeNode & {
  childNodes: FakeNode[];
  firstChild: FakeNode | null;
  namespaceURI: string;
  ownerDocument: typeof fakeDocument;
  style: Record<string, unknown>;
  tagName: string;
};

class FakeNode {
  childNodes: FakeNode[] = [];
  nodeType: number;
  nodeName: string;
  parentNode: FakeNode | null = null;

  constructor(nodeName: string) {
    this.nodeName = nodeName.toUpperCase();
    this.nodeType = nodeName === '#text' ? 3 : 1;
  }

  appendChild(node: FakeNode) {
    this.childNodes.push(node);
    node.parentNode = this;
    return node;
  }

  insertBefore(node: FakeNode, beforeNode: FakeNode | null) {
    if (!beforeNode) return this.appendChild(node);
    const index = this.childNodes.indexOf(beforeNode);
    if (index === -1) return this.appendChild(node);
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }

  removeChild(node: FakeNode) {
    this.childNodes = this.childNodes.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  addEventListener() {}
  removeEventListener() {}

  get firstChild() {
    return this.childNodes[0] ?? null;
  }
}

class FakeDomElement extends FakeNode {
  namespaceURI = 'http://www.w3.org/1999/xhtml';
  ownerDocument = fakeDocument;
  style: Record<string, unknown> = {};
  tagName: string;

  constructor(tagName: string) {
    super(tagName);
    this.tagName = this.nodeName;
  }

  setAttribute() {}
  removeAttribute() {}
}

const fakeDocument = {
  nodeType: 9,
  addEventListener() {},
  removeEventListener() {},
  createElement(tagName: string) {
    return new FakeDomElement(tagName) as FakeElement;
  },
  createElementNS(_namespaceURI: string, tagName: string) {
    return new FakeDomElement(tagName) as FakeElement;
  },
  createTextNode(text: string) {
    const node = new FakeNode('#text');
    Object.assign(node, { data: text, nodeValue: text });
    return node;
  },
};

type Purchase = {
  purchaseState?: string;
  purchaseToken?: string | null;
  store?: string;
  transactionId?: string;
};

type UseIapOptions = {
  onPurchaseSuccess?: (purchase: Purchase) => void | Promise<void>;
};

type IapContextProbe = {
  error: string | null;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
  sync: () => Promise<void>;
};

type NativeHostProps = {
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  disabled?: boolean;
  onPress?: () => void;
};

function NativeHost(tagName: string) {
  return function Host({ children, disabled, onPress }: NativeHostProps) {
    return React.createElement(tagName, {
      children: typeof children === 'function' ? children({ pressed: false }) : children,
      disabled,
      onClick: onPress,
    });
  };
}

const inactiveSubscription: SubscriptionSnapshot = {
  entitlement: 'premium',
  isActive: false,
  state: 'inactive',
  platform: null,
  productId: null,
  originalTransactionId: null,
  transactionId: null,
  expiresAt: null,
  willAutoRenew: null,
  updatedAt: null,
};

const activeSubscription: SubscriptionSnapshot = {
  entitlement: 'premium',
  isActive: true,
  state: 'active',
  platform: 'ios',
  productId: 'premium_monthly',
  originalTransactionId: 'original-1',
  transactionId: 'transaction-1',
  expiresAt: '2026-06-19T00:00:00.000Z',
  willAutoRenew: true,
  updatedAt: '2026-05-19T00:00:00.000Z',
};

const purchase = {
  purchaseState: 'purchased',
  purchaseToken: 'signed-transaction',
  store: 'apple',
  transactionId: 'transaction-1',
};

let authState: {
  api: {
    iapEntitlement: ReturnType<typeof mock>;
    ingestAppStoreTransaction: ReturnType<typeof mock>;
    reconcileAppStoreTransactions: ReturnType<typeof mock>;
  };
  isBootstrapping: boolean;
  setSubscription: ReturnType<typeof mock>;
  user: { id: string; subscription: SubscriptionSnapshot } | null;
};
let availablePurchases: Purchase[] = [];
let currentIap: {
  connected: boolean;
  fetchProducts: ReturnType<typeof mock>;
  finishTransaction: ReturnType<typeof mock>;
  requestPurchase: ReturnType<typeof mock>;
  restorePurchases: ReturnType<typeof mock>;
  subscriptions: unknown[];
};
let latestUseIapOptions: UseIapOptions = {};
let latestContext: IapContextProbe | null = null;

mock.module('react-native', () => ({
  ActivityIndicator: NativeHost('span'),
  AppState: {
    addEventListener() {
      return { remove() {} };
    },
  },
  Modal: NativeHost('div'),
  Platform: { OS: 'ios' },
  Pressable: NativeHost('button'),
  ScrollView: NativeHost('div'),
  StyleSheet: {
    absoluteFillObject: {},
    create<T>(styles: T) {
      return styles;
    },
    hairlineWidth: 1,
  },
  Text: NativeHost('span'),
  View: NativeHost('div'),
  useColorScheme() {
    return 'light';
  },
}));

mock.module('expo-iap', () => ({
  deepLinkToSubscriptions: mock(async () => undefined),
  getAvailablePurchases: mock(async () => availablePurchases),
  useIAP(options: UseIapOptions) {
    latestUseIapOptions = options;
    return currentIap;
  },
}));

mock.module('../src/lib/auth', () => ({
  useAuth() {
    return authState;
  },
}));

Object.assign(globalThis, {
  document: fakeDocument,
  HTMLElement: FakeDomElement,
  HTMLIFrameElement: class HTMLIFrameElement extends FakeDomElement {},
  IS_REACT_ACT_ENVIRONMENT: true,
  window: globalThis,
});

beforeEach(() => {
  availablePurchases = [];
  latestUseIapOptions = {};
  currentIap = {
    connected: true,
    fetchProducts: mock(async () => undefined),
    finishTransaction: mock(async () => undefined),
    requestPurchase: mock(async () => undefined),
    restorePurchases: mock(async () => undefined),
    subscriptions: [],
  };
  authState = {
    api: {
      iapEntitlement: mock(async () => ({ subscription: inactiveSubscription })),
      ingestAppStoreTransaction: mock(async () => ({ subscription: activeSubscription })),
      reconcileAppStoreTransactions: mock(async () => ({ subscription: activeSubscription })),
    },
    isBootstrapping: false,
    setSubscription: mock(() => undefined),
    user: {
      id: '018fd4f2-1f3a-7c88-bc49-333333333333',
      subscription: inactiveSubscription,
    },
  };
  latestContext = null;
});

test('IapProvider finishes purchase callbacks only after backend ingest succeeds', async () => {
  const events: string[] = [];
  authState.api.ingestAppStoreTransaction = mock(async () => {
    events.push('ingest');
    return { subscription: activeSubscription };
  });
  currentIap.finishTransaction = mock(async () => {
    events.push('finish');
  });

  const root = await renderProvider();

  await act(async () => {
    await latestUseIapOptions.onPurchaseSuccess?.(purchase);
    await waitForEffects();
  });

  expect(events).toEqual(['ingest', 'finish']);
  expect(authState.api.ingestAppStoreTransaction).toHaveBeenCalledWith({
    signedTransactionInfo: 'signed-transaction',
  });
  expect(currentIap.finishTransaction).toHaveBeenCalledTimes(1);
  await unmount(root);
});

test('IapProvider restore reconciles available purchases with the backend before finishing', async () => {
  const events: string[] = [];
  authState.user = {
    id: '018fd4f2-1f3a-7c88-bc49-333333333333',
    subscription: {
      ...inactiveSubscription,
      originalTransactionId: 'original-1',
    },
  };
  authState.api.reconcileAppStoreTransactions = mock(async () => {
    events.push('reconcile');
    return { subscription: activeSubscription };
  });
  currentIap.finishTransaction = mock(async () => {
    events.push('finish');
  });

  const root = await renderProvider();
  availablePurchases = [purchase];

  await act(async () => {
    await latestContext?.restore();
    await waitForEffects();
  });

  expect(events).toEqual(['reconcile', 'finish']);
  expect(authState.api.reconcileAppStoreTransactions).toHaveBeenCalledWith({
    signedTransactions: ['signed-transaction'],
    originalTransactionIds: ['original-1'],
  });
  await unmount(root);
});

test('IapProvider restore does not mask StoreKit restore failures as empty restores', async () => {
  const originalWarn = console.warn;
  console.warn = mock(() => undefined) as never;
  currentIap.restorePurchases = mock(async () => {
    throw { code: 'network-error' };
  });

  try {
    const root = await renderProvider();

    await act(async () => {
      await latestContext?.restore();
      await waitForEffects();
    });

    expect(latestContext?.error).toContain('temporarily unavailable');
    expect(authState.api.reconcileAppStoreTransactions).not.toHaveBeenCalled();
    await unmount(root);
  } finally {
    console.warn = originalWarn;
  }
});

test('IapProvider restore ignores user-cancelled restore sheets', async () => {
  const originalWarn = console.warn;
  console.warn = mock(() => undefined) as never;
  authState.user = {
    id: '018fd4f2-1f3a-7c88-bc49-333333333333',
    subscription: {
      ...inactiveSubscription,
      originalTransactionId: 'original-1',
    },
  };
  currentIap.restorePurchases = mock(async () => {
    throw { code: 'user-cancelled' };
  });

  try {
    const root = await renderProvider();

    await act(async () => {
      await latestContext?.restore();
      await waitForEffects();
    });

    expect(latestContext?.error).toBeNull();
    expect(authState.api.reconcileAppStoreTransactions).not.toHaveBeenCalled();
    expect(currentIap.finishTransaction).not.toHaveBeenCalled();
    await unmount(root);
  } finally {
    console.warn = originalWarn;
  }
});

test('IapProvider restore surfaces StoreKit failures for linked original transactions without local purchases', async () => {
  const originalWarn = console.warn;
  console.warn = mock(() => undefined) as never;
  authState.user = {
    id: '018fd4f2-1f3a-7c88-bc49-333333333333',
    subscription: {
      ...inactiveSubscription,
      originalTransactionId: 'original-1',
    },
  };
  currentIap.restorePurchases = mock(async () => {
    throw { code: 'network-error' };
  });
  authState.api.reconcileAppStoreTransactions = mock(async () => ({ subscription: inactiveSubscription }));

  try {
    const root = await renderProvider();

    await act(async () => {
      await latestContext?.restore();
      await waitForEffects();
    });

    expect(latestContext?.error).toContain('temporarily unavailable');
    expect(authState.api.reconcileAppStoreTransactions).toHaveBeenCalledWith({
      originalTransactionIds: ['original-1'],
    });
    await unmount(root);
  } finally {
    console.warn = originalWarn;
  }
});

test('IapProvider sync does not finish purchases already being processed by purchase callback', async () => {
  let resolveIngest: ((value: { subscription: SubscriptionSnapshot }) => void) | null = null;
  authState.api.ingestAppStoreTransaction = mock(
    () =>
      new Promise((resolve) => {
        resolveIngest = resolve;
      }),
  );

  const root = await renderProvider();

  await act(async () => {
    latestUseIapOptions.onPurchaseSuccess?.(purchase);
    await waitForEffects();
  });
  availablePurchases = [purchase];

  await act(async () => {
    await latestContext?.sync();
    await waitForEffects();
  });

  expect(authState.api.reconcileAppStoreTransactions).toHaveBeenCalledWith({
    signedTransactions: ['signed-transaction'],
  });
  expect(currentIap.finishTransaction).not.toHaveBeenCalled();

  await act(async () => {
    resolveIngest?.({ subscription: activeSubscription });
    await waitForEffects();
  });

  expect(currentIap.finishTransaction).toHaveBeenCalledTimes(1);
  await unmount(root);
});

test('IapProvider does not resync just because an unchanged subscription rerenders auth state', async () => {
  authState.setSubscription = mock((subscription: SubscriptionSnapshot) => {
    if (!authState.user) return;
    authState.user = {
      ...authState.user,
      subscription: { ...subscription },
    };
  });

  const root = await renderProvider();
  await waitForEffects();

  expect(authState.api.iapEntitlement).toHaveBeenCalledTimes(1);

  await rerenderProvider(root);
  await waitForEffects();

  expect(authState.api.iapEntitlement).toHaveBeenCalledTimes(1);
});

test('IapProvider blocks store actions while the App Store connection is not ready', async () => {
  currentIap.connected = false;
  currentIap.subscriptions = [
    {
      displayName: 'Premium',
      displayPrice: '$9.99',
      id: 'premium_monthly',
      title: 'Premium Monthly',
    },
  ];

  const root = await renderProvider();

  await act(async () => {
    await latestContext?.purchase();
    await waitForEffects();
  });

  expect(latestContext?.error).toBe('App Store connection is not ready yet. Please try again in a moment.');
  expect(currentIap.requestPurchase).not.toHaveBeenCalled();
  expect(authState.api.ingestAppStoreTransaction).not.toHaveBeenCalled();

  await act(async () => {
    await latestContext?.restore();
    await waitForEffects();
  });

  expect(latestContext?.error).toBe('App Store connection is not ready yet. Please try again in a moment.');
  expect(currentIap.restorePurchases).not.toHaveBeenCalled();
  expect(authState.api.reconcileAppStoreTransactions).not.toHaveBeenCalled();
  await unmount(root);
});

async function renderProvider() {
  const container = fakeDocument.createElement('div');
  const root = createRoot(container);

  await renderProviderTree(root);

  return root;
}

async function rerenderProvider(root: Root) {
  await renderProviderTree(root);
}

async function renderProviderTree(root: Root) {
  const { IapProvider, useSubscriptionIap } = await import('../src/lib/iap');

  function Probe() {
    latestContext = useSubscriptionIap();
    return null;
  }

  await act(async () => {
    root.render(
      <IapProvider>
        <Probe />
      </IapProvider>,
    );
    await waitForEffects();
  });
}

function waitForEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
    await waitForEffects();
  });
}
