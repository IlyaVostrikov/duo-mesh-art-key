import { createHash } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'

import type { DbClient } from '../db'
import { derivePbkdf2Key, decryptString, encryptString, hexToBytes } from '../crypto/aes-gcm'
import type { EncryptedEntry } from '../crypto/aes-gcm'
import { createKdfMigrationRoutes } from './kdf-migration'

const SECRET = 'test-secret-store-key-32-chars-min!!!'
const SEED_TOKEN = 'test-seed-token'
const SALT = 'ab'.repeat(32)

type SigningKeyRow = {
  id: string
  encryptedPrivateKey: EncryptedEntry
}

async function encryptLegacy(secret: string, plaintext: string): Promise<EncryptedEntry> {
  const hashHex = createHash('sha256').update(secret).digest('hex')
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(hashHex),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return encryptString(key, plaintext)
}

function createTestApp(prisma: DbClient) {
  const app = new Hono<{ Variables: { prisma: DbClient } }>()
  app.use('*', async (c, next) => {
    c.set('prisma', prisma)
    await next()
  })
  app.route('/', createKdfMigrationRoutes())
  return app
}

async function withMigrationEnv<T>(values: Record<string, string>, fn: () => Promise<T>) {
  const previous = new Map<string, string | undefined>()
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name])
    process.env[name] = value
  }
  try {
    return await fn()
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

describe('KDF migration route', () => {
  test('migrates legacy SHA-256 entries using the runtime salt and Node crypto', async () => {
    const legacyEntry = await encryptLegacy(SECRET, 'platform-private-key')
    const updates: unknown[] = []
    let transactionCalls = 0
    const prisma = {
      signingKey: {
        findMany: async () => [{ id: 'platform-key', encryptedPrivateKey: legacyEntry }],
        update: async (args: unknown) => {
          updates.push(args)
          return args
        },
      },
      $transaction: async (queries: Promise<unknown>[]) => {
        transactionCalls++
        return Promise.all(queries)
      },
    } as unknown as DbClient

    await withMigrationEnv(
      { SEED_TOKEN, SECRET_STORE_KEY: SECRET, KEYSTORE_SALT: SALT },
      async () => {
        const response = await createTestApp(prisma).request('/run-kdf-migration', {
          method: 'POST',
          headers: { 'x-seed-token': SEED_TOKEN },
        })
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toMatchObject({ success: true, total: 1, ok: 1, already: 0, fail: 0 })
        expect(transactionCalls).toBe(1)
        expect(updates).toHaveLength(1)

        const newEntry = (updates[0] as { data: { encryptedPrivateKey: EncryptedEntry } }).data.encryptedPrivateKey
        const newKey = await derivePbkdf2Key(SECRET, hexToBytes(SALT))
        await expect(decryptString(newKey, newEntry)).resolves.toBe('platform-private-key')
      },
    )
  })

  test('rejects an invalid configured salt before reading the database', async () => {
    let findManyCalls = 0
    const prisma = {
      signingKey: {
        findMany: async () => {
          findManyCalls++
          return []
        },
      },
    } as unknown as DbClient

    await withMigrationEnv(
      { SEED_TOKEN, SECRET_STORE_KEY: SECRET, KEYSTORE_SALT: 'not-a-valid-salt' },
      async () => {
        const response = await createTestApp(prisma).request('/run-kdf-migration', {
          method: 'POST',
          headers: { 'x-seed-token': SEED_TOKEN },
        })
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body.error).toMatchObject({ code: 'INTERNAL_ERROR' })
        expect(findManyCalls).toBe(0)
      },
    )
  })
})