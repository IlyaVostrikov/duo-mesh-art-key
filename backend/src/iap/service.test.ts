import { Environment, Status, type ResponseBodyV2DecodedPayload } from '@apple/app-store-server-library'
import { expect, mock, test } from 'bun:test'

import type { DbClient } from '../db'
import type { AppEnv } from '../env'
import { SubscriptionState } from '../generated/prisma/enums'
import type { AppStoreSubscriptionVerifier } from './apple-verifier'
import { reconcileAppStoreTransactions, recordAndProcessAppStoreWebhook } from './service'

const env: AppEnv = {
  PORT: 3000,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test?schema=public',
  JWT_SECRET: '12345678901234567890123456789012',
  CORS_ORIGINS: ['http://localhost:5173'],
  ACCESS_TOKEN_TTL_SECONDS: 60,
  REFRESH_TOKEN_TTL_DAYS: 30,
  COOKIE_SECURE: false,
  SPACES_UPLOAD_MAX_BYTES: 10 * 1024 * 1024,
  SPACES_UPLOAD_URL_TTL_SECONDS: 900,
  SPACES_DOWNLOAD_URL_TTL_SECONDS: 300,
  SPACES_PUBLIC_CACHE_CONTROL: 'public, max-age=31536000, immutable',
  APPLE_IAP_ENVIRONMENT: 'Sandbox',
  APPLE_IAP_PRODUCT_IDS: ['premium_monthly'],
}

test('releases webhook claims when final processed marker write fails', async () => {
  const deleteMany = mock(async () => ({ count: 1 }))
  const db = {
    appStoreWebhook: {
      create: mock(async () => ({ id: 'webhook-1' })),
      update: mock(async (args: { data: { processedAt?: Date } }) => {
        if (args.data.processedAt) {
          throw new Error('final marker write failed')
        }
        return { id: 'webhook-1' }
      }),
      deleteMany,
    },
    appStoreTransaction: {
      upsert: mock(async () => ({ id: 'transaction-row-1' })),
    },
    subscriptionEntitlement: {
      findUnique: mock(async () => null),
      upsert: mock(async () => ({
        platform: 'ios',
        state: SubscriptionState.active,
        productId: 'premium_monthly',
        originalTransactionId: 'original-1',
        transactionId: 'transaction-1',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        willAutoRenew: null,
        updatedAt: new Date(),
      })),
    },
    user: {
      findUnique: mock(async () => ({ id: '018fd4f2-1f3a-7c88-bc49-333333333333' })),
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(db),
  } as unknown as DbClient

  await expect(
    recordAndProcessAppStoreWebhook({
      db,
      env,
      verifier: fakeVerifier(),
      signedPayload: 'signed-webhook',
    }),
  ).rejects.toThrow('final marker write failed')

  expect(deleteMany).toHaveBeenCalledWith({
    where: {
      id: 'webhook-1',
      processedAt: null,
    },
  })
})

test('uses the configured production App Store environment for original transaction reconcile', async () => {
  const getSubscriptionStatuses = mock(async () => [])
  const db = {
    subscriptionEntitlement: {
      findUnique: mock(async () => null),
    },
  } as unknown as DbClient

  await reconcileAppStoreTransactions({
    db,
    env: {
      ...env,
      APPLE_IAP_APP_APPLE_ID: 123456789,
      APPLE_IAP_ENVIRONMENT: 'Production',
    },
    verifier: {
      ...fakeVerifier(),
      getSubscriptionStatuses,
    },
    userId: '018fd4f2-1f3a-7c88-bc49-333333333333',
    originalTransactionIds: ['original-1'],
  })

  expect(getSubscriptionStatuses).toHaveBeenCalledWith({
    transactionId: 'original-1',
    environment: Environment.PRODUCTION,
  })
})

function fakeVerifier(): AppStoreSubscriptionVerifier {
  const notification: ResponseBodyV2DecodedPayload = {
    notificationUUID: 'notification-1',
    notificationType: 'DID_RENEW',
    data: {
      environment: Environment.SANDBOX,
      signedTransactionInfo: 'signed-transaction',
      status: Status.ACTIVE,
    },
  }

  return {
    async verifyNotification() {
      return { environment: Environment.SANDBOX, payload: notification }
    },
    async verifyTransaction() {
      return {
        environment: Environment.SANDBOX,
        payload: {
          appAccountToken: '018fd4f2-1f3a-7c88-bc49-333333333333',
          environment: Environment.SANDBOX,
          expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          originalTransactionId: 'original-1',
          productId: 'premium_monthly',
          purchaseDate: Date.now() - 60_000,
          transactionId: 'transaction-1',
        },
      }
    },
    async verifyRenewalInfo() {
      throw new Error('unexpected renewal verification')
    },
    async getSubscriptionStatuses() {
      return []
    },
  }
}
