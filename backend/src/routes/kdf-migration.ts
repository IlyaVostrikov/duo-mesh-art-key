// KDF migration endpoint (P1-12)
// POST /api/run-kdf-migration
// Protected by x-seed-token header (same mechanism as seed endpoint).
//
// Re-encrypts all DB signing_keys.encryptedPrivateKey from old SHA-256 KDF
// to new PBKDF2 KDF using the committed keystore.salt.

import { Hono } from 'hono'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { errorResponse } from '../http/errors'
import { rateLimiter } from '../http/rate-limiter'
import type { DbClient } from '../db'
import { Prisma } from '../generated/prisma/client'
import { derivePbkdf2Key, decryptString, encryptString, hexToBytes } from '../crypto/aes-gcm'
import type { EncryptedEntry } from '../crypto/aes-gcm'

/** Old KDF: SHA-256(SECRET) → raw AES-256-GCM key (legacy, pre-PBKDF2). */
async function oldDeriveKey(secret: string): Promise<CryptoKey> {
  const hashHex = createHash('sha256').update(secret).digest('hex')
  return crypto.subtle.importKey('raw', hexToBytes(hashHex),
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
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
        return c.json(errorResponse('INTERNAL_ERROR', 'SECRET_STORE_KEY not set'), 500)
      }

      // Use the same salt as the runtime. Vercel runs from a bundle and may not
      // contain the source data file, so KEYSTORE_SALT is the authoritative value.
      // The file remains a local/dev fallback when the env variable is absent.
      const configuredSalt = process.env.KEYSTORE_SALT
      let saltHex = configuredSalt?.trim()
      if (saltHex === undefined) {
        const saltPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/keystore.salt')
        try {
          saltHex = (await readFile(saltPath, 'utf-8')).trim()
        } catch {
          return c.json(errorResponse('NOT_FOUND', 'Salt not found — set KEYSTORE_SALT or commit keystore.salt first'), 500)
        }
      }
      if (!/^[0-9a-f]{64}$/i.test(saltHex)) {
        return c.json(errorResponse('INTERNAL_ERROR', 'KEYSTORE_SALT must be exactly 64 hexadecimal characters'), 500)
      }

      console.log('→ Running KDF migration (DB only)...')
      const salt = hexToBytes(saltHex)
      const oldKey = await oldDeriveKey(secret)
      const newKey = await derivePbkdf2Key(secret, salt)

      const prisma = c.get('prisma')
      const keys = await prisma.signingKey.findMany({
        where: { encryptedPrivateKey: { not: Prisma.DbNull } },
        select: { id: true, encryptedPrivateKey: true },
      })

      let ok = 0
      let already = 0
      let fail = 0
      const errors: string[] = []
      const toUpdate: { id: string; newEntry: EncryptedEntry }[] = []

      for (const key of keys) {
        const entry = key.encryptedPrivateKey as EncryptedEntry | null
        if (!entry?.ciphertext || !entry?.iv) {
          fail++
          errors.push(`${key.id.slice(0, 8)}: invalid format`)
          continue
        }
        try {
          const plaintext = await decryptString(oldKey, entry)
          const newEntry = await encryptString(newKey, plaintext)
          toUpdate.push({ id: key.id, newEntry })
          ok++
        } catch {
          // Old KDF failed — the row may already be under PBKDF2 from a prior run.
          try {
            await decryptString(newKey, entry)
            already++
          } catch {
            fail++
            errors.push(`${key.id.slice(0, 8)}: unknown KDF/secret`)
          }
        }
      }

      // Do not partially migrate the table: if any row failed, leave every
      // old-KDF row untouched so a retry can safely process the full set.
      if (fail === 0 && toUpdate.length > 0) {
        await prisma.$transaction(
          toUpdate.map(({ id, newEntry }) =>
            prisma.signingKey.update({
              where: { id },
              data: { encryptedPrivateKey: newEntry as unknown as Prisma.InputJsonValue },
            }),
          ),
        )
      }

      const result = {
        success: fail === 0,
        message: fail === 0
          ? `Migration complete: ${ok} keys re-encrypted with PBKDF2${already > 0 ? `, ${already} already migrated` : ''}`
          : `Partial migration: ${ok} OK, ${already} already migrated, ${fail} FAILED`,
        saltPrefix: saltHex.slice(0, 16) + '...',
        total: keys.length,
        ok,
        already,
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
