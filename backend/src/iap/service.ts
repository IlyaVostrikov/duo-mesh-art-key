import { createHash } from 'node:crypto'

import { AutoRenewStatus, Environment, Status, type JWSRenewalInfoDecodedPayload, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library'
import type { SubscriptionSnapshot } from '@web-app-demo/contracts'

import type { DbClient } from '../db'
import type { AppEnv } from '../env'
import { Prisma } from '../generated/prisma/client'
import { SubscriptionState } from '../generated/prisma/enums'
import { AppError } from '../http/errors'
import type {
  AppStoreStatusTransaction,
  AppStoreSubscriptionVerifier,
  AppStoreVerificationResult,
} from './apple-verifier'

export type EntitlementRecord = {
  platform: 'ios' | null
  state: SubscriptionState
  productId: string | null
  originalTransactionId: string | null
  transactionId: string | null
  expiresAt: Date | null
  willAutoRenew: boolean | null
  updatedAt: Date
}

type ApplyTransactionInput = {
  userId: string
  signedTransactionInfo: string
  signedRenewalInfo?: string | null
  verifiedTransaction: AppStoreVerificationResult<JWSTransactionDecodedPayload>
  verifiedRenewal?: AppStoreVerificationResult<JWSRenewalInfoDecodedPayload> | null
  status?: Status | number | null
}

type ReconcileAttemptState = {
  firstError: unknown
  latestSnapshot: SubscriptionSnapshot | null
}

export function inactiveSubscriptionSnapshot(): SubscriptionSnapshot {
  return {
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
  }
}

export async function getSubscriptionSnapshot(db: DbClient, userId: string): Promise<SubscriptionSnapshot> {
  const entitlement = await db.subscriptionEntitlement.findUnique({
    where: { userId },
  })

  return entitlement ? toSubscriptionSnapshot(entitlement) : inactiveSubscriptionSnapshot()
}

export async function ingestAppStoreTransaction(input: {
  db: DbClient
  env: AppEnv
  verifier: AppStoreSubscriptionVerifier
  userId: string
  signedTransactionInfo: string
  signedRenewalInfo?: string | null
}): Promise<SubscriptionSnapshot> {
  const verifiedTransaction = await input.verifier.verifyTransaction(input.signedTransactionInfo)
  const verifiedRenewal = input.signedRenewalInfo
    ? await input.verifier.verifyRenewalInfo(input.signedRenewalInfo)
    : null

  return applyVerifiedAppStoreTransaction({
    db: input.db,
    env: input.env,
    input: {
      userId: input.userId,
      signedTransactionInfo: input.signedTransactionInfo,
      signedRenewalInfo: input.signedRenewalInfo,
      verifiedTransaction,
      verifiedRenewal,
    },
  })
}

export async function reconcileAppStoreTransactions(input: {
  db: DbClient
  env: AppEnv
  verifier: AppStoreSubscriptionVerifier
  userId: string
  signedTransactions?: string[]
  originalTransactionIds?: string[]
}): Promise<SubscriptionSnapshot> {
  const attemptState: ReconcileAttemptState = {
    firstError: null,
    latestSnapshot: null,
  }

  for (const signedTransactionInfo of input.signedTransactions ?? []) {
    await recordReconcileAttempt(attemptState, () =>
      ingestAppStoreTransaction({
        db: input.db,
        env: input.env,
        verifier: input.verifier,
        userId: input.userId,
        signedTransactionInfo,
      }),
    )
  }

  for (const originalTransactionId of input.originalTransactionIds ?? []) {
    await recordReconcileAttempt(attemptState, async () => {
      const environment = await resolveStatusLookupEnvironment({
        db: input.db,
        env: input.env,
        userId: input.userId,
        originalTransactionId,
      })
      const statusItems = await input.verifier.getSubscriptionStatuses({
        transactionId: originalTransactionId,
        environment,
      })
      return applyStatusTransactions({
        db: input.db,
        env: input.env,
        verifier: input.verifier,
        userId: input.userId,
        statusItems,
      })
    })
  }

  if (attemptState.latestSnapshot) return attemptState.latestSnapshot
  if (attemptState.firstError) throw attemptState.firstError

  return getSubscriptionSnapshot(input.db, input.userId)
}

export async function recordAndProcessAppStoreWebhook(input: {
  db: DbClient
  env: AppEnv
  verifier: AppStoreSubscriptionVerifier
  signedPayload: string
}): Promise<{ duplicate: boolean; subscription: SubscriptionSnapshot | null }> {
  const signedPayloadHash = hashToken(input.signedPayload)
  const webhook = await claimAppStoreWebhook(input.db, signedPayloadHash)
  if (!webhook) {
    return { duplicate: true, subscription: null }
  }

  try {
    const verifiedNotification = await input.verifier.verifyNotification(input.signedPayload)
    const notification = verifiedNotification.payload
    const signedTransactionInfo = notification.data?.signedTransactionInfo
    const signedRenewalInfo = notification.data?.signedRenewalInfo
    const verifiedTransaction = signedTransactionInfo
      ? await input.verifier.verifyTransaction(signedTransactionInfo)
      : null
    const verifiedRenewal = signedRenewalInfo ? await input.verifier.verifyRenewalInfo(signedRenewalInfo) : null
    const transaction = verifiedTransaction?.payload

    await input.db.appStoreWebhook.update({
      where: { id: webhook.id },
      data: {
        notificationUuid: notification.notificationUUID ?? null,
        notificationType: notification.notificationType ? String(notification.notificationType) : null,
        subtype: notification.subtype ? String(notification.subtype) : null,
        environment: formatEnvironment(notification.data?.environment ?? verifiedNotification.environment),
        originalTransactionId: transaction?.originalTransactionId ?? null,
        transactionId: transaction?.transactionId ?? null,
      },
    })

    if (!signedTransactionInfo || !verifiedTransaction) {
      await markAppStoreWebhookProcessed(input.db, webhook.id)
      return { duplicate: false, subscription: null }
    }

    const userId = await resolveWebhookUserId({
      db: input.db,
      transaction: verifiedTransaction.payload,
    })

    if (!userId) {
      await markAppStoreWebhookProcessed(input.db, webhook.id)
      return { duplicate: false, subscription: null }
    }

    const subscription = await applyVerifiedAppStoreTransaction({
      db: input.db,
      env: input.env,
      input: {
        userId,
        signedTransactionInfo,
        signedRenewalInfo,
        verifiedTransaction,
        verifiedRenewal,
        status: notification.data?.status,
      },
    })

    await markAppStoreWebhookProcessed(input.db, webhook.id)

    return { duplicate: false, subscription }
  } catch (error) {
    await releaseFailedAppStoreWebhookClaim(input.db, webhook.id)
    throw error
  }
}

async function applyStatusTransactions(input: {
  db: DbClient
  env: AppEnv
  verifier: AppStoreSubscriptionVerifier
  userId: string
  statusItems: AppStoreStatusTransaction[]
}): Promise<SubscriptionSnapshot | null> {
  const attemptState: ReconcileAttemptState = {
    firstError: null,
    latestSnapshot: null,
  }

  for (const item of input.statusItems) {
    if (!item.signedTransactionInfo) continue

    await recordReconcileAttempt(attemptState, async () => {
      const verifiedTransaction = await input.verifier.verifyTransaction(item.signedTransactionInfo!)
      const verifiedRenewal = item.signedRenewalInfo
        ? await input.verifier.verifyRenewalInfo(item.signedRenewalInfo)
        : null

      return applyVerifiedAppStoreTransaction({
        db: input.db,
        env: input.env,
        input: {
          userId: input.userId,
          signedTransactionInfo: item.signedTransactionInfo!,
          signedRenewalInfo: item.signedRenewalInfo,
          verifiedTransaction,
          verifiedRenewal,
          status: item.status,
        },
      })
    })
  }

  if (attemptState.latestSnapshot) return attemptState.latestSnapshot
  if (attemptState.firstError) throw attemptState.firstError

  return null
}

async function resolveStatusLookupEnvironment({
  db,
  env,
  userId,
  originalTransactionId,
}: {
  db: DbClient
  env: AppEnv
  userId: string
  originalTransactionId: string
}) {
  const entitlement = await db.subscriptionEntitlement.findUnique({
    where: { userId },
    select: { environment: true, originalTransactionId: true },
  })

  if (entitlement?.originalTransactionId === originalTransactionId) {
    return toAppStoreEnvironment(entitlement.environment ?? env.APPLE_IAP_ENVIRONMENT)
  }

  return toAppStoreEnvironment(env.APPLE_IAP_ENVIRONMENT)
}

async function claimAppStoreWebhook(db: DbClient, signedPayloadHash: string) {
  try {
    return await db.appStoreWebhook.create({
      data: { signedPayloadHash },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) return null
    throw error
  }
}

async function markAppStoreWebhookProcessed(db: DbClient, id: string) {
  return db.appStoreWebhook.update({
    where: { id },
    data: { processedAt: new Date() },
  })
}

async function releaseFailedAppStoreWebhookClaim(db: DbClient, id: string) {
  await db.appStoreWebhook.deleteMany({
    where: {
      id,
      processedAt: null,
    },
  })
}

async function applyVerifiedAppStoreTransaction({
  db,
  env,
  input,
}: {
  db: DbClient
  env: AppEnv
  input: ApplyTransactionInput
}): Promise<SubscriptionSnapshot> {
  const transaction = input.verifiedTransaction.payload
  const renewal = input.verifiedRenewal?.payload ?? null
  const originalTransactionId = transaction.originalTransactionId ?? renewal?.originalTransactionId
  const transactionId = transaction.transactionId
  const productId = transaction.productId ?? renewal?.productId ?? renewal?.autoRenewProductId

  if (!originalTransactionId || !transactionId || !productId) {
    throw new AppError(400, 'IAP_INVALID_TRANSACTION', 'App Store transaction is missing required identifiers')
  }

  if (env.APPLE_IAP_PRODUCT_IDS.length === 0) {
    throw new AppError(
      503,
      'IAP_NOT_CONFIGURED',
      'App Store subscription product IDs are not configured',
    )
  }

  if (!env.APPLE_IAP_PRODUCT_IDS.includes(productId)) {
    throw new AppError(400, 'IAP_INVALID_TRANSACTION', 'App Store transaction product is not configured')
  }

  const expiresAt = toDate(transaction.expiresDate ?? renewal?.renewalDate)
  assertSubscriptionHasExpiration(transaction, renewal, expiresAt, input.status)
  await assertTransactionOwnership({
    db,
    userId: input.userId,
    originalTransactionId,
    appAccountToken: transaction.appAccountToken,
  })

  const state = resolveSubscriptionState(transaction, renewal, input.status)
  const willAutoRenew =
    renewal?.autoRenewStatus == null ? null : renewal.autoRenewStatus === AutoRenewStatus.ON
  const environment = formatEnvironment(transaction.environment ?? renewal?.environment ?? input.verifiedTransaction.environment)
  const signedTransactionHash = hashToken(input.signedTransactionInfo)
  const signedRenewalHash = input.signedRenewalInfo ? hashToken(input.signedRenewalInfo) : null

  const entitlement = await db.$transaction(async (tx) => {
    await tx.appStoreTransaction.upsert({
      where: { transactionId },
      create: {
        userId: input.userId,
        originalTransactionId,
        transactionId,
        webOrderLineItemId: transaction.webOrderLineItemId ?? null,
        productId,
        state,
        environment,
        appAccountToken: transaction.appAccountToken ?? null,
        purchaseDate: toDate(transaction.purchaseDate),
        expiresAt,
        revokedAt: toDate(transaction.revocationDate),
        willAutoRenew,
        signedTransactionHash,
        signedRenewalHash,
      },
      update: {
        userId: input.userId,
        originalTransactionId,
        webOrderLineItemId: transaction.webOrderLineItemId ?? null,
        productId,
        state,
        environment,
        appAccountToken: transaction.appAccountToken ?? null,
        purchaseDate: toDate(transaction.purchaseDate),
        expiresAt,
        revokedAt: toDate(transaction.revocationDate),
        willAutoRenew,
        signedTransactionHash,
        signedRenewalHash,
      },
    })

    const existingEntitlement = await tx.subscriptionEntitlement.findUnique({
      where: { userId: input.userId },
    })

    if (
      existingEntitlement &&
      !shouldUpdateEntitlement({
        existing: existingEntitlement,
        incoming: {
          transactionId,
          originalTransactionId,
          purchaseDate: toDate(transaction.purchaseDate),
          expiresAt,
          revokedAt: toDate(transaction.revocationDate),
        },
      })
    ) {
      return existingEntitlement
    }

    return tx.subscriptionEntitlement.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        entitlementKey: 'premium',
        platform: 'ios',
        state,
        productId,
        originalTransactionId,
        transactionId,
        webOrderLineItemId: transaction.webOrderLineItemId ?? null,
        expiresAt,
        willAutoRenew,
        environment,
      },
      update: {
        platform: 'ios',
        state,
        productId,
        originalTransactionId,
        transactionId,
        webOrderLineItemId: transaction.webOrderLineItemId ?? null,
        expiresAt,
        willAutoRenew,
        environment,
      },
    })
  })

  return toSubscriptionSnapshot(entitlement)
}

async function assertTransactionOwnership({
  appAccountToken,
  db,
  originalTransactionId,
  userId,
}: {
  appAccountToken: string | null | undefined
  db: DbClient
  originalTransactionId: string
  userId: string
}) {
  if (appAccountToken) {
    if (appAccountToken === userId) return
    throw ownershipMismatchError()
  }

  const existingEntitlement = await db.subscriptionEntitlement.findUnique({
    where: { originalTransactionId },
    select: { userId: true },
  })

  if (existingEntitlement?.userId === userId) return

  throw ownershipMismatchError()
}

function ownershipMismatchError() {
  return new AppError(
    403,
    'IAP_OWNERSHIP_MISMATCH',
    'This App Store purchase is linked to another account',
  )
}

function assertSubscriptionHasExpiration(
  transaction: JWSTransactionDecodedPayload,
  renewal: JWSRenewalInfoDecodedPayload | null,
  expiresAt: Date | null,
  status?: Status | number | null,
) {
  if (expiresAt || transaction.revocationDate || status === Status.REVOKED) return

  throw new AppError(
    400,
    'IAP_INVALID_TRANSACTION',
    'App Store subscription transaction is missing an expiration date',
    renewal ? undefined : { transactionId: transaction.transactionId },
  )
}

function shouldUpdateEntitlement({
  existing,
  incoming,
}: {
  existing: EntitlementRecord & {
    webOrderLineItemId?: string | null
  }
  incoming: {
    transactionId: string
    originalTransactionId: string
    purchaseDate: Date | null
    expiresAt: Date | null
    revokedAt: Date | null
  }
}) {
  if (!existing.transactionId) return true
  if (existing.transactionId === incoming.transactionId) return true
  if (!existing.originalTransactionId) return true
  if (existing.originalTransactionId !== incoming.originalTransactionId) return true

  const existingFreshness = existing.expiresAt?.getTime() ?? 0
  const incomingFreshness = incoming.expiresAt?.getTime() ?? incoming.purchaseDate?.getTime() ?? 0

  if (incomingFreshness > existingFreshness) return true
  if (incomingFreshness < existingFreshness) return false

  return true
}

async function recordReconcileAttempt(
  state: ReconcileAttemptState,
  attempt: () => Promise<SubscriptionSnapshot | null>,
) {
  try {
    state.latestSnapshot = (await attempt()) ?? state.latestSnapshot
  } catch (error) {
    state.firstError ??= error
  }
}

async function resolveWebhookUserId({
  db,
  transaction,
}: {
  db: DbClient
  transaction: JWSTransactionDecodedPayload
}) {
  if (transaction.appAccountToken) {
    const user = await db.user.findUnique({
      where: { id: transaction.appAccountToken },
      select: { id: true },
    })
    if (user) return user.id
  }

  if (transaction.originalTransactionId) {
    const entitlement = await db.subscriptionEntitlement.findUnique({
      where: { originalTransactionId: transaction.originalTransactionId },
      select: { userId: true },
    })
    if (entitlement) return entitlement.userId
  }

  return null
}

function resolveSubscriptionState(
  transaction: JWSTransactionDecodedPayload,
  renewal: JWSRenewalInfoDecodedPayload | null,
  status?: Status | number | null,
): SubscriptionState {
  if (transaction.revocationDate) return SubscriptionState.revoked

  switch (status) {
    case Status.ACTIVE:
      return SubscriptionState.active
    case Status.BILLING_GRACE_PERIOD:
      return SubscriptionState.billing_grace_period
    case Status.BILLING_RETRY:
      return SubscriptionState.billing_retry
    case Status.EXPIRED:
      return SubscriptionState.expired
    case Status.REVOKED:
      return SubscriptionState.revoked
  }

  if (renewal?.isInBillingRetryPeriod) return SubscriptionState.billing_retry

  const expiresAt = toDate(transaction.expiresDate ?? renewal?.renewalDate)
  if (!expiresAt || expiresAt.getTime() > Date.now()) return SubscriptionState.active

  return SubscriptionState.expired
}

export function toSubscriptionSnapshot(entitlement: EntitlementRecord): SubscriptionSnapshot {
  const state = effectiveSubscriptionState(entitlement)
  const isActive =
    state === SubscriptionState.active ||
    state === SubscriptionState.billing_grace_period

  return {
    entitlement: 'premium',
    isActive,
    state,
    platform: entitlement.platform,
    productId: entitlement.productId,
    originalTransactionId: entitlement.originalTransactionId,
    transactionId: entitlement.transactionId,
    expiresAt: entitlement.expiresAt?.toISOString() ?? null,
    willAutoRenew: entitlement.willAutoRenew,
    updatedAt: entitlement.updatedAt.toISOString(),
  }
}

function effectiveSubscriptionState(entitlement: EntitlementRecord): SubscriptionState {
  if (
    (entitlement.state === SubscriptionState.active ||
      entitlement.state === SubscriptionState.billing_grace_period) &&
    entitlement.expiresAt &&
    entitlement.expiresAt.getTime() <= Date.now()
  ) {
    return SubscriptionState.expired
  }

  return entitlement.state
}

function toDate(value: number | null | undefined) {
  if (!value) return null
  return new Date(value)
}

function formatEnvironment(value: Environment | string | null | undefined) {
  if (!value) return null
  return String(value).toLowerCase()
}

function toAppStoreEnvironment(value: Environment | string | null | undefined) {
  if (value === Environment.PRODUCTION || value === 'Production' || value === 'production') {
    return Environment.PRODUCTION
  }

  return Environment.SANDBOX
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
