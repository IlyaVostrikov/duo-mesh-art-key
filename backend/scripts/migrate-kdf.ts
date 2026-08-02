// KDF migration: SHA-256 → PBKDF2 (P1-12)
//
// Re-encrypts all keystore entries and DB signing_keys.encryptedPrivateKey
// with a PBKDF2-derived key instead of the old SHA-256-derived key.
//
// Usage:
//   bun run scripts/migrate-kdf.ts [--dry-run]
//
// Prerequisites:
//   SECRET_STORE_KEY  — the secret used for key derivation
//   DATABASE_URL      — Postgres connection string (only needed for DB migration)
//   KEYSTORE_PATH     — path to keystore.json (default: ../data/keystore.json)
//
// Dry run decrypts everything with the old key and reports without writing.

import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '../src/generated/prisma/client'

// ── Config ──

const DRY_RUN = process.argv.includes('--dry-run')
const PBKDF2_ITERATIONS = 600_000

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

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('base64')
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array([...Buffer.from(b64, 'base64')])
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('hex')
}

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

/** New KDF: PBKDF2(SECRET, salt, 600K iter, SHA-256) → AES-256-GCM key. */
async function newDeriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function decrypt(key: CryptoKey, entry: StoreEntry): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(entry.iv) },
    key,
    base64ToBytes(entry.ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}

async function encrypt(key: CryptoKey, plaintext: string): Promise<StoreEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
  }
}

// ── Main ──

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be written\n' : '🔐 KDF migration: SHA-256 → PBKDF2\n')

  // 1. Derive both keys
  console.log('Deriving old key (SHA-256)...')
  const oldKey = await oldDeriveKey(SECRET!)

  const salt = crypto.getRandomValues(new Uint8Array(32))
  console.log(`Salt (hex): ${bytesToHex(salt)}`)
  console.log('Deriving new key (PBKDF2, 600K iterations)...')
  const newKey = await newDeriveKey(SECRET!, salt)

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
  let keystoreFail = 0

  for (const [keyId, entry] of entries) {
    try {
      const plaintext = await decrypt(oldKey, entry)
      if (!DRY_RUN) {
        store[keyId] = await encrypt(newKey, plaintext)
      }
      console.log(`  ✅ ${keyId.slice(0, 8)}... — decrypted OK (${plaintext.length} chars)`)
      keystoreOk++
    } catch (err) {
      console.error(`  ❌ ${keyId.slice(0, 8)}... — FAILED:`, (err as Error).message)
      keystoreFail++
    }
  }

  // 3. Migrate DB signing_keys
  console.log('\n── Database: signing_keys.encryptedPrivateKey')
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.log('  DATABASE_URL not set — skipping DB migration.')
  } else {
    const prisma = new PrismaClient()
    let dbOk = 0
    let dbFail = 0

    try {
      const keys = await prisma.signingKey.findMany({
        where: { encryptedPrivateKey: { not: null } },
        select: { id: true, encryptedPrivateKey: true },
      })
      console.log(`  Rows with encryptedPrivateKey: ${keys.length}`)

      for (const key of keys) {
        const entry = key.encryptedPrivateKey as StoreEntry | null
        if (!entry?.ciphertext || !entry?.iv) {
          console.error(`  ❌ ${key.id.slice(0, 8)}... — invalid entry format, skipping`)
          dbFail++
          continue
        }
        try {
          const plaintext = await decrypt(oldKey, entry)
          if (!DRY_RUN) {
            const newEntry = await encrypt(newKey, plaintext)
            await prisma.signingKey.update({
              where: { id: key.id },
              data: { encryptedPrivateKey: newEntry },
            })
          }
          console.log(`  ✅ ${key.id.slice(0, 8)}... — decrypted OK (${plaintext.length} chars)`)
          dbOk++
        } catch (err) {
          console.error(`  ❌ ${key.id.slice(0, 8)}... — FAILED:`, (err as Error).message)
          dbFail++
        }
      }
    } finally {
      await prisma.$disconnect()
    }

    if (dbFail > 0) {
      console.error(`\nDB: ${dbOk} OK, ${dbFail} FAILED`)
    } else {
      console.log(`\nDB: ${dbOk} OK`)
    }
  }

  // 4. Write results
  if (DRY_RUN) {
    console.log(`\n🔍 Dry run complete. Keystore: ${keystoreOk} OK, ${keystoreFail} failed.`)
    if (keystoreFail > 0) process.exit(1)
    console.log('Run without --dry-run to apply migration.')
    return
  }

  if (keystoreFail > 0) {
    console.error('\n❌ Some keystore entries failed to decrypt. Aborting.')
    console.error('   Fix the failing entries before retrying.')
    process.exit(1)
  }

  // Backup original keystore
  const bak = KEYSTORE_PATH + '.bak'
  console.log(`\nBacking up keystore → ${bak}`)
  await copyFile(KEYSTORE_PATH, bak)

  // Write updated keystore
  console.log('Writing updated keystore...')
  await writeFile(KEYSTORE_PATH, JSON.stringify(store, null, 2))

  // Write salt file
  console.log(`Writing salt → ${SALT_PATH}`)
  await writeFile(SALT_PATH, bytesToHex(salt) + '\n')

  console.log('\n✅ Migration complete.')
  console.log('   Deploy the updated keystore.ts code now.')
  console.log('   Keep keystore.json.bak until you verify the new code works.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
