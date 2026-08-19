// KDF migration: SHA-256 → PBKDF2 (P1-12)
//
// Re-encrypts all keystore entries and DB signing_keys.encryptedPrivateKey
// with a PBKDF2-derived key instead of the old SHA-256-derived key.
//
// Usage:
//   bun run scripts/migrate-kdf.ts [--dry-run] [--force]
//
// Prerequisites:
//   SECRET_STORE_KEY  — the secret used for key derivation
//   DATABASE_URL      — Postgres connection string (only needed for DB migration)
//   KEYSTORE_PATH     — path to keystore.json (default: ../data/keystore.json)
//
// Dry run decrypts everything with the old key and reports without writing.

import { config } from 'dotenv'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPrisma } from '../src/db'
import { Prisma } from '../src/generated/prisma/client'
import { derivePbkdf2Key, decryptString, encryptString, hexToBytes, bytesToHex } from '../src/crypto/aes-gcm'

// ── Config ──

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

const ENV_PATH = resolve(import.meta.dir ?? __dirname, '../.env')
// Load backend/.env explicitly so SECRET_STORE_KEY / DATABASE_URL are set
// regardless of the caller's CWD (Bun only auto-loads .env relative to CWD).
try {
  config({ path: ENV_PATH })
} catch { /* no .env — the caller must supply secrets via the environment */ }

const SECRET = process.env.SECRET_STORE_KEY
if (!SECRET) {
  console.error('ERROR: SECRET_STORE_KEY env var is required')
  process.exit(1)
}

const KEYSTORE_PATH = resolve(
  process.env.KEYSTORE_PATH ?? resolve(import.meta.dir ?? __dirname, '../data/keystore.json'),
)
const SALT_PATH = KEYSTORE_PATH.replace(/\.json$/, '.salt')

interface StoreEntry {
  ciphertext: string
  iv: string
}

interface StoreFile {
  [keyId: string]: StoreEntry
}

// ── Crypto helpers ──

/** Old KDF: SHA-256(SECRET) → raw AES-256-GCM key. */
async function oldDeriveKey(secret: string): Promise<CryptoKey> {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(secret)
  const hashHex = hasher.digest('hex') as string
  return crypto.subtle.importKey(
    'raw',
    hexToBytes(hashHex),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ── Main ──

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be written\n' : '🔐 KDF migration: SHA-256 → PBKDF2\n')

  // 1. Derive both keys
  console.log('Deriving old key (SHA-256)...')
  const oldKey = await oldDeriveKey(SECRET!)

  // Reuse the committed salt if present (idempotent), otherwise generate fresh.
  let salt: Uint8Array<ArrayBuffer>
  let saltIsFresh = false
  try {
    const existingSaltHex = (await readFile(SALT_PATH, 'utf-8')).trim()
    if (/^[0-9a-f]{64}$/i.test(existingSaltHex)) {
      salt = hexToBytes(existingSaltHex)
      console.log(`Reusing existing salt from ${SALT_PATH}`)
    } else {
      salt = crypto.getRandomValues(new Uint8Array(32))
      saltIsFresh = true
    }
  } catch {
    salt = crypto.getRandomValues(new Uint8Array(32))
    saltIsFresh = true
  }
  console.log(`Salt (hex): ${bytesToHex(salt)}`)
  console.log('Deriving new key (PBKDF2, 600K iterations)...')
  const newKey = await derivePbkdf2Key(SECRET!, salt)

  // Persist a freshly generated salt BEFORE re-encrypting anything: if we crash
  // mid-migration the salt is already on disk, so the re-encrypted entries stay
  // decryptable. (A reused salt is already on disk.)
  if (!DRY_RUN && saltIsFresh) {
    await writeFile(SALT_PATH, bytesToHex(salt) + '\n')
    console.log(`Writing salt → ${SALT_PATH} (persisted before re-encryption)`)
  }

  // 2. Migrate keystore.json
  console.log(`\n── Keystore: ${KEYSTORE_PATH}`)
  let storeRaw: string
  try {
    storeRaw = await readFile(KEYSTORE_PATH, 'utf-8')
  } catch {
    console.log('  Keystore file not found — creating empty store.')
    storeRaw = '{}'
  }
  const store: StoreFile = JSON.parse(storeRaw)
  const entries = Object.entries(store)
  console.log(`  Entries: ${entries.length}`)

  if (entries.length === 0) {
    console.log('  Nothing to migrate.')
  }

  let keystoreOk = 0
  let keystoreSkipped = 0
  let alreadyPbkdf2 = 0

  for (const [keyId, entry] of entries) {
    try {
      const plaintext = await decryptString(oldKey, entry)
      if (!DRY_RUN) {
        store[keyId] = await encryptString(newKey, plaintext)
      }
      console.log(`  ✅ ${keyId.slice(0, 8)}... — decrypted OK (${plaintext.length} chars)`)
      keystoreOk++
      continue
    } catch {
      // old KDF failed — try the new KDF below
    }

    try {
      await decryptString(newKey, entry)
      console.log(`  ⏭  ${keyId.slice(0, 8)}... — already PBKDF2, skipping`)
      alreadyPbkdf2++
    } catch {
      console.warn(`  ⚠  ${keyId.slice(0, 8)}... — unknown KDF/secret (orphaned?), left untouched`)
      keystoreSkipped++
    }
  }

  // 3. Migrate DB signing_keys
  console.log('\n── Database: signing_keys.encryptedPrivateKey')
  const dbUrl = process.env.DATABASE_URL
  let dbOk = 0
  let dbSkipped = 0
  if (!dbUrl) {
    if (!DRY_RUN) {
      console.error('\n❌ ABORT: DATABASE_URL is not set.')
      console.error('   signing_keys.encrypted_private_key may still be under the old SHA-256 KDF;')
      console.error('   skipping the DB migration would brick the backend on restart.')
      console.error('   Set DATABASE_URL (or run with --dry-run to inspect without writing).')
      process.exit(1)
    }
    console.log('  DATABASE_URL not set — skipping DB migration (dry run).')
  } else {
    const prisma = createPrisma(dbUrl)

    try {
      const keys = await prisma.signingKey.findMany({
        where: { encryptedPrivateKey: { not: Prisma.DbNull } },
        select: { id: true, encryptedPrivateKey: true },
      })
      console.log(`  Rows with encryptedPrivateKey: ${keys.length}`)

      const toUpdate: { id: string; newEntry: StoreEntry }[] = []

      for (const key of keys) {
        const entry = key.encryptedPrivateKey as StoreEntry | null
        if (!entry?.ciphertext || !entry?.iv) {
          console.error(`  ❌ ${key.id.slice(0, 8)}... — invalid entry format, skipping`)
          dbSkipped++
          continue
        }
        try {
          const plaintext = await decryptString(oldKey, entry)
          if (!DRY_RUN) {
            toUpdate.push({ id: key.id, newEntry: await encryptString(newKey, plaintext) })
          }
          console.log(`  ✅ ${key.id.slice(0, 8)}... — decrypted OK (${plaintext.length} chars)`)
          dbOk++
        } catch {
          // old KDF failed — maybe already migrated?
          try {
            await decryptString(newKey, entry)
            console.log(`  ⏭  ${key.id.slice(0, 8)}... — already PBKDF2, skipping`)
            alreadyPbkdf2++
          } catch {
            console.warn(`  ⚠  ${key.id.slice(0, 8)}... — unknown KDF/secret, left untouched`)
            dbSkipped++
          }
        }
      }

      // Apply all DB re-encryptions atomically — a crash mid-way leaves either the
      // old or the new KDF for every row, never a mixed state. The DB is written
      // here, BEFORE the keystore file below: a crash in that window leaves DB
      // new-PBKDF2 but keystore old-SHA-256, which the new code can't decrypt
      // (ensureKeys' sync is guarded by has(), so stale keystore entries are never
      // overwritten from DB). Re-running this script recovers — keystore entries
      // are still old-KDF and get migrated; DB rows are detected already-PBKDF2.
      // (Keystore-first was rejected: the DB is the durable source of truth for
      // Vercel cold starts, so it must be migrated before the ephemeral keystore.)
      if (!DRY_RUN && toUpdate.length > 0) {
        await prisma.$transaction(
          toUpdate.map(({ id, newEntry }) =>
            prisma.signingKey.update({
              where: { id },
              data: { encryptedPrivateKey: newEntry as unknown as Prisma.InputJsonValue },
            }),
          ),
        )
        console.log(`  Applied ${toUpdate.length} DB re-encryptions atomically`)
      }
    } finally {
      await prisma.$disconnect()
    }

    console.log(`\nDB: ${dbOk} OK, ${dbSkipped} skipped`)
  }

  // Safety: if there is data but nothing was decryptable with EITHER the old or
  // new KDF, SECRET_STORE_KEY is almost certainly wrong. Abort rather than
  // silently "succeeding" — matches rotate-secret's hard abort. No data has been
  // written yet (only a fresh salt, which is harmless and reused on the next
  // correct run).
  const totalDbRows = dbOk + dbSkipped
  if (keystoreOk === 0 && dbOk === 0 && alreadyPbkdf2 === 0 && (entries.length > 0 || totalDbRows > 0)) {
    console.error('\n❌ ABORT: no entries decrypted with either the old or new KDF.')
    console.error('   SECRET_STORE_KEY is likely wrong. Nothing was migrated.')
    process.exit(1)
  }

  // Any entry that failed BOTH KDFs is orphaned (encrypted under an unknown
  // secret). Silently "completing" would leave that key un-decryptable with the
  // new PBKDF2 key → signing breaks on restart. Fail fast unless --force.
  if (keystoreSkipped > 0 || dbSkipped > 0) {
    if (FORCE) {
      console.warn(`\n⚠  ${keystoreSkipped + dbSkipped} orphaned entr${keystoreSkipped + dbSkipped === 1 ? 'y' : 'ies'} left untouched (--force).`)
    } else {
      console.error('\n❌ ABORT: some entries could not be decrypted with either KDF.')
      console.error(`   Keystore skipped: ${keystoreSkipped}; DB skipped: ${dbSkipped}.`)
      console.error('   These entries are encrypted under an unknown secret — investigate before migrating.')
      console.error('   Pass --force to migrate only the decryptable entries and leave orphans untouched.')
      process.exit(1)
    }
  }

  // 4. Write results
  if (DRY_RUN) {
    console.log(`\n🔍 Dry run complete. Keystore: ${keystoreOk} to migrate, ${keystoreSkipped} skipped.`)
    console.log('Run without --dry-run to apply migration.')
    return
  }

  if (keystoreOk === 0 && dbOk === 0) {
    console.log('\nNothing to migrate — no keystore or DB entries were decryptable with the old KDF.')
    return
  }

  // Backup original keystore
  const bak = KEYSTORE_PATH + '.bak'
  console.log(`\nBacking up keystore → ${bak}`)
  await copyFile(KEYSTORE_PATH, bak).catch((err) => {
    console.warn(`  ⚠  Keystore backup failed (${(err as Error).message}) — continuing without ${bak}`)
  })

  // Write updated keystore
  console.log('Writing updated keystore...')
  await writeFile(KEYSTORE_PATH, JSON.stringify(store, null, 2))

  console.log('\n✅ Migration complete.')
  console.log('   Deploy the updated keystore.ts code now.')
  console.log('   Keep keystore.json.bak until you verify the new code works.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
