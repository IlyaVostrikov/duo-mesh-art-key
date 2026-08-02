// KDF migration endpoint (P1-12)
// POST /api/run-kdf-migration
// Protected by x-seed-token header (same mechanism as seed endpoint).
//
// Re-encrypts all DB signing_keys.encryptedPrivateKey from old SHA-256 KDF
// to new PBKDF2 KDF using the committed keystore.salt.

import { Hono } from 'hono'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { errorResponse } from '../http/errors'
import { rateLimiter } from '../http/rate-limiter'
import type { DbClient } from '../db'

const PBKDF2_ITERATIONS = 600_000

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}
function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('base64')
}
function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array([...Buffer.from(b64, 'base64')])
}

interface StoreEntry {
  ciphertext: string
  iv: string
}

async function oldDeriveKey(secret: string): Promise<CryptoKey> {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(secret)
  const hashHex = hasher.digest('hex') as string
  return crypto.subtle.importKey('raw', hexToBytes(hashHex),
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function newDeriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw',
    new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function decrypt(key: CryptoKey, entry: StoreEntry): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(entry.iv) }, key, base64ToBytes(entry.ciphertext))
  return new TextDecoder().decode(plaintext)
}

async function encrypt(key: CryptoKey, plaintext: string): Promise<StoreEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return { ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv) }
}

export function createKdfMigrationRoutes() {
  const routes = new Hono<{ Variables: { prisma: DbClient } }>()

  routes.post('/run-kdf-migration',
    rateLimiter({ windowMs: 60_000, max: 1, message: 'Migration already triggered.' }),
    async (c) => {
      const token = c.req.header('x-seed-token') ?? ''
      const expected = process.env.SEED_TOKEN ?? ''
      const expectedHash = createHash('sha256').update(expected).digest()
      const actualHash = createHash('sha256').update(token).digest()
      if (!expected || !token || !timingSafeEqual(expectedHash, actualHash)) {
        return c.json(errorResponse('UNAUTHORIZED', 'Invalid or missing seed token'), 401)
      }

      const secret = process.env.SECRET_STORE_KEY
      if (!secret) {
        return c.json(errorResponse('NOT_CONFIGURED', 'SECRET_STORE_KEY not set'), 500)
      }

      // Read committed salt
      const saltPath = resolve(import.meta.dir ?? __dirname, '../data/keystore.salt')
      let saltHex: string
      try {
        saltHex = (await readFile(saltPath, 'utf-8')).trim()
      } catch {
        return c.json(errorResponse('NOT_FOUND', 'Salt file not found — commit keystore.salt first'), 500)
      }

      console.log('→ Running KDF migration (DB only)...')
      const salt = hexToBytes(saltHex)
      const oldKey = await oldDeriveKey(secret)
      const newKey = await newDeriveKey(secret, salt)

      const prisma = c.get('prisma')
      const keys = await prisma.signingKey.findMany({
        where: { encryptedPrivateKey: { not: null } },
        select: { id: true, encryptedPrivateKey: true },
      })

      let ok = 0
      let fail = 0
      const errors: string[] = []

      for (const key of keys) {
        const entry = key.encryptedPrivateKey as StoreEntry | null
        if (!entry?.ciphertext || !entry?.iv) {
          fail++
          errors.push(`${key.id.slice(0, 8)}: invalid format`)
          continue
        }
        try {
          const plaintext = await decrypt(oldKey, entry)
          const newEntry = await encrypt(newKey, plaintext)
          await prisma.signingKey.update({
            where: { id: key.id },
            data: { encryptedPrivateKey: newEntry },
          })
          ok++
        } catch (err) {
          fail++
          errors.push(`${key.id.slice(0, 8)}: ${(err as Error).message}`)
        }
      }

      const result = {
        success: fail === 0,
        message: fail === 0
          ? `Migration complete: ${ok} keys re-encrypted with PBKDF2`
          : `Partial migration: ${ok} OK, ${fail} FAILED`,
        saltPrefix: saltHex.slice(0, 16) + '...',
        total: keys.length,
        ok,
        fail,
        errors: errors.length > 0 ? errors : undefined,
      }

      if (fail > 0) {
        return c.json({ ...result, error: { code: 'MIGRATION_FAILED', message: result.message } }, 500)
      }
      return c.json(result)
    },
  )

  return routes
}
