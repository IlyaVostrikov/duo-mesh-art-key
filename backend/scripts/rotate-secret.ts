// SECRET_STORE_KEY rotation: re-encrypt keystore + DB under a new secret (both PBKDF2).
//
// Why: the keystore/DB were historically encrypted with the dev placeholder
// secret. Rotating to a strong random secret closes Q3 from E2E-AUDIT.md.
//
// Usage:
//   bun run scripts/rotate-secret.ts --dry-run   # verify OLD secret decrypts (no writes)
//   bun run scripts/rotate-secret.ts --generate  # generate new secret, write .env, then rotate
//   bun run scripts/rotate-secret.ts             # rotate using OLD + NEW secrets from env
//   ... [--force]                                # leave orphaned entries untouched (no abort)
//
// Prerequisites:
//   OLD_SECRET_STORE_KEY — secret the data is CURRENTLY encrypted with
//                          (default: the known dev placeholder)
//   SECRET_STORE_KEY     — NEW secret to re-encrypt under (or use --generate)
//   DATABASE_URL         — Postgres connection string (auto-loaded from backend/.env)

import { config } from 'dotenv'
import { readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { createPrisma } from '../src/db'
import { Prisma } from '../src/generated/prisma/client'
import { derivePbkdf2Key, decryptString, encryptString, hexToBytes } from '../src/crypto/aes-gcm'

const DRY_RUN = process.argv.includes('--dry-run')
const GENERATE = process.argv.includes('--generate')
const FORCE = process.argv.includes('--force')

const DEV_PLACEHOLDER = 'dev-secret-store-key-change-in-production-!!!'

const KEYSTORE_PATH = resolve(
  process.env.KEYSTORE_PATH ?? resolve(import.meta.dir ?? __dirname, '../data/keystore.json'),
)
const SALT_PATH = KEYSTORE_PATH.replace(/\.json$/, '.salt')
const ENV_PATH = resolve(import.meta.dir ?? __dirname, '../.env')
const NEXT_ENV_PATH = ENV_PATH + '.rotate-next'

// Load backend/.env explicitly so secrets are set regardless of the caller's
// CWD (Bun only auto-loads .env relative to CWD). Must run before OLD_SECRET is
// read below, otherwise a non-backend CWD would silently fall back to the dev
// placeholder and brick a rotation.
try {
  config({ path: ENV_PATH })
} catch { /* no .env — the caller must supply secrets via the environment */ }

// In --generate mode the current .env SECRET_STORE_KEY is the secret we are
// rotating AWAY from, so it doubles as the OLD secret when the operator has not
// set OLD_SECRET_STORE_KEY explicitly (e.g. a second rotation). Outside
// --generate the .env secret is the NEW target and must not be used as OLD.
const OLD_SECRET =
  process.env.OLD_SECRET_STORE_KEY ??
  (GENERATE ? process.env.SECRET_STORE_KEY : null) ??
  DEV_PLACEHOLDER

interface StoreEntry {
  ciphertext: string
  iv: string
}
interface StoreFile {
  [keyId: string]: StoreEntry
}

async function generateSecret(): Promise<string> {
  return randomBytes(32).toString('hex')
}

async function writeEnvSecret(secret: string): Promise<void> {
  await copyFile(ENV_PATH, ENV_PATH + '.pre-rotate.bak').catch(() => {})
  const raw = await readFile(ENV_PATH, 'utf-8').catch(() => '')
  const withoutOld = raw.replace(/^SECRET_STORE_KEY=.*\r?$/gm, '').trimEnd()
  // Guard against format drift: if any SECRET_STORE_KEY line survived (e.g. the
  // file uses `SECRET_STORE_KEY = ...` or `export SECRET_STORE_KEY=...`), dotenv's
  // first-wins rule would leave the backend on the OLD secret against NEW-secret
  // data → outage on restart. Abort rather than write a second, losing line.
  if (/SECRET_STORE_KEY\s*=/.test(withoutOld)) {
    console.error('ERROR: could not cleanly replace SECRET_STORE_KEY in .env — unexpected format.')
    console.error(`Refusing to write. Inspect ${ENV_PATH} and update the secret manually.`)
    process.exit(1)
  }
  await writeFile(ENV_PATH, withoutOld + '\nSECRET_STORE_KEY=' + secret + '\n')
}

// ── main ──

async function main() {
  let NEW_SECRET = process.env.SECRET_STORE_KEY

  // Resume a prior run that crashed after staging a generated secret but before
  // flipping .env. Reusing the staged secret (instead of generating a new one)
  // keeps the already-rotated data decryptable.
  const staged = await readFile(NEXT_ENV_PATH, 'utf-8').catch(() => null)
  const stagedSecret = staged?.trim() || undefined

  if (GENERATE) {
    // --generate must mint a NEW random secret even when a secret is already
    // loaded from .env; only reuse a staged secret from a crashed prior run.
    NEW_SECRET = stagedSecret ?? (await generateSecret())
    if (stagedSecret) {
      console.log(`♻  Resuming prior rotation — reusing staged secret from ${NEXT_ENV_PATH}`)
    }
  } else if (!NEW_SECRET) {
    NEW_SECRET = stagedSecret
    if (stagedSecret) {
      console.log(`♻  Resuming prior rotation — reusing staged secret from ${NEXT_ENV_PATH}`)
    }
  }

  if (!DRY_RUN && !NEW_SECRET) {
    console.error('ERROR: SECRET_STORE_KEY is required (set it, or pass --generate)')
    process.exit(1)
  }

  if (!DRY_RUN && NEW_SECRET === OLD_SECRET) {
    console.warn('\n⚠  NEW secret is identical to the OLD secret — nothing will actually rotate.')
  }

  console.log(DRY_RUN ? '🔍 DRY RUN — no changes written\n' : '🔐 SECRET_STORE_KEY rotation\n')

  const saltHex = (await readFile(SALT_PATH, 'utf-8')).trim()
  const salt = hexToBytes(saltHex)
  const oldKey = await derivePbkdf2Key(OLD_SECRET, salt)
  const newKey = NEW_SECRET ? await derivePbkdf2Key(NEW_SECRET, salt) : null

  // ── Phase 1: verify the OLD secret decrypts the data BEFORE writing anything ──

  const store: StoreFile = JSON.parse(await readFile(KEYSTORE_PATH, 'utf-8').catch(() => '{}'))
  const keystorePlaintexts = new Map<string, string>()
  let keystoreOk = 0
  let keystoreSkipped = 0
  let alreadyRotated = 0

  console.log(`── Keystore: ${KEYSTORE_PATH}`)
  for (const [keyId, entry] of Object.entries(store)) {
    try {
      const plaintext = await decryptString(oldKey, entry)
      keystorePlaintexts.set(keyId, plaintext)
      console.log(`  ✅ ${keyId.slice(0, 8)}... — decrypted with OLD secret (${plaintext.length} chars)`)
      keystoreOk++
    } catch {
      // OLD failed — if resuming, the entry may already be under the NEW secret.
      if (newKey) {
        try {
          await decryptString(newKey, entry)
          alreadyRotated++
          console.log(`  ⏭  ${keyId.slice(0, 8)}... — already under NEW secret, leaving`)
        } catch {
          keystoreSkipped++
          console.warn(`  ⚠  ${keyId.slice(0, 8)}... — not decryptable with OLD or NEW secret (orphaned), left untouched`)
        }
      } else {
        keystoreSkipped++
        console.warn(`  ⚠  ${keyId.slice(0, 8)}... — not decryptable with OLD secret (orphaned), left untouched`)
      }
    }
  }

  const dbRows: { id: string; plaintext: string }[] = []
  let dbOk = 0
  let dbSkipped = 0
  const dbUrl = process.env.DATABASE_URL
  if (!DRY_RUN && !dbUrl) {
    console.error('\n❌ ABORT: DATABASE_URL is not set.')
    console.error('   signing_keys.encrypted_private_key may still be under the OLD secret;')
    console.error('   skipping DB re-encryption would brick the backend on restart.')
    console.error('   Set DATABASE_URL (or run with --dry-run to inspect without writing).')
    process.exit(1)
  }
  const prisma = dbUrl ? createPrisma(dbUrl) : null

  try {
    if (prisma) {
      const keys = await prisma.signingKey.findMany({
        where: { encryptedPrivateKey: { not: Prisma.DbNull } },
        select: { id: true, encryptedPrivateKey: true },
      })
      console.log(`\n── DB signing_keys.encryptedPrivateKey: ${keys.length} rows`)

      for (const k of keys) {
        const entry = k.encryptedPrivateKey as StoreEntry | null
        if (!entry?.ciphertext || !entry?.iv) {
          dbSkipped++
          console.warn(`  ⚠  ${k.id.slice(0, 8)}... — invalid entry format, skipped`)
          continue
        }
        try {
          const plaintext = await decryptString(oldKey, entry)
          dbRows.push({ id: k.id, plaintext })
          console.log(`  ✅ ${k.id.slice(0, 8)}... — decrypted with OLD secret`)
          dbOk++
        } catch {
          // OLD failed — if resuming, the row may already be under the NEW secret.
          if (newKey) {
            try {
              await decryptString(newKey, entry)
              alreadyRotated++
              console.log(`  ⏭  ${k.id.slice(0, 8)}... — already under NEW secret, leaving`)
            } catch {
              dbSkipped++
              console.warn(`  ⚠  ${k.id.slice(0, 8)}... — not decryptable with OLD or NEW secret (orphaned), left untouched`)
            }
          } else {
            dbSkipped++
            console.warn(`  ⚠  ${k.id.slice(0, 8)}... — not decryptable with OLD secret (orphaned), left untouched`)
          }
        }
      }
    } else {
      console.log('\nDATABASE_URL not set — skipping DB re-encryption.')
    }

    // Safety: if there is data to rotate but NONE of it decrypts with the OLD
    // secret (and none is already under the NEW secret), the OLD secret is wrong.
    // Abort before writing anything, otherwise we'd write a new secret into .env
    // that can't decrypt the data (bricks the backend on next restart).
    const totalKeystoreEntries = Object.keys(store).length
    const totalDbRows = dbRows.length + dbSkipped
    if (!DRY_RUN && keystoreOk === 0 && dbOk === 0 && alreadyRotated === 0 && (totalKeystoreEntries > 0 || totalDbRows > 0)) {
      console.error('\n❌ ABORT: the OLD secret decrypted nothing, but there is data to rotate.')
      console.error('   OLD_SECRET_STORE_KEY is likely wrong. No files or DB rows were written.')
      process.exit(1)
    }

    // Orphaned entries (failed both OLD and NEW secrets) would be left under an
    // unknown secret while the rest rotates — a key split across two secrets is
    // un-decryptable after the .env flip. Fail fast unless --force (parity with
    // migrate-kdf). Dry run only reports counts and does not abort.
    if (!DRY_RUN && (keystoreSkipped > 0 || dbSkipped > 0)) {
      if (FORCE) {
        console.warn(`\n⚠  ${keystoreSkipped + dbSkipped} orphaned entries left untouched (--force).`)
      } else {
        console.error('\n❌ ABORT: some entries could not be decrypted with either the OLD or NEW secret.')
        console.error(`   Keystore skipped: ${keystoreSkipped}; DB skipped: ${dbSkipped}.`)
        console.error('   These entries are orphaned (encrypted under an unknown secret) and would be left inconsistent.')
        console.error('   Pass --force to rotate only the decryptable entries and leave orphans untouched.')
        process.exit(1)
      }
    }

    // ── Phase 2: write (only after verification passed) ──

    if (DRY_RUN) {
      console.log(`\n🔍 Dry run: keystore ${keystoreOk} OK / ${keystoreSkipped} skipped; DB ${dbOk} OK / ${dbSkipped} skipped.`)
      console.log('Run without --dry-run to apply rotation.')
      return
    }

    // Stage the new secret to a temp file BEFORE re-encrypting anything, so it is
    // never lost if we crash before flipping .env. The temp file is not .env, so a
    // running backend (which loads .env at startup) is unaffected until the flip.
    // Re-staging on resume is a harmless no-op (same secret).
    if (NEW_SECRET) {
      await writeFile(NEXT_ENV_PATH, NEW_SECRET + '\n')
      console.log(`Staged new secret → ${NEXT_ENV_PATH}`)
    }

    // 1. Re-encrypt keystore (backup original first), then DB, then flip .env last.
    for (const [keyId, plaintext] of keystorePlaintexts) {
      store[keyId] = await encryptString(newKey!, plaintext)
    }
    await copyFile(KEYSTORE_PATH, KEYSTORE_PATH + '.pre-rotate.bak').catch((err) => {
      console.warn(`  ⚠  Keystore backup failed (${(err as Error).message}) — continuing without a pre-rotate backup`)
    })
    await writeFile(KEYSTORE_PATH, JSON.stringify(store, null, 2))

    // 2. Re-encrypt DB rows in a single transaction (all-or-nothing).
    if (prisma && dbRows.length > 0) {
      const updates = await Promise.all(
        dbRows.map(async (row) => ({
          where: { id: row.id },
          data: { encryptedPrivateKey: await encryptString(newKey!, row.plaintext) as unknown as Prisma.InputJsonValue },
        })),
      )
      await prisma.$transaction(updates.map((u) => prisma.signingKey.update(u)))
    }

    // 3. Flip .env LAST — only after the data is re-encrypted under the new
    //    secret, so a restart never sees a new .env with old data. This runs in
    //    BOTH modes (--generate and explicit SECRET_STORE_KEY), otherwise a
    //    non-generate rotation would leave .env stale and brick a restart.
    if (NEW_SECRET) {
      await writeEnvSecret(NEW_SECRET)
      await rm(NEXT_ENV_PATH, { force: true }).catch(() => {})
      console.log(`Wrote new SECRET_STORE_KEY to backend/.env (${NEW_SECRET.length} chars)`)
    }

    // 4. Post-write verify: the written keystore must round-trip with the new key.
    if (keystorePlaintexts.size > 0) {
      const verifyStore: StoreFile = JSON.parse(await readFile(KEYSTORE_PATH, 'utf-8'))
      const sampleId = keystorePlaintexts.keys().next().value as string
      const roundtrip = await decryptString(newKey!, verifyStore[sampleId])
      if (roundtrip !== keystorePlaintexts.get(sampleId)) {
        throw new Error('Post-write verify failed: keystore does not round-trip with the new secret')
      }
      console.log('✅ Post-write verify: keystore round-trips with the new secret')
    }

    console.log(`\n✅ Rotation complete. Keystore: ${keystoreOk} rotated, ${keystoreSkipped} skipped. DB: ${dbOk} rotated, ${dbSkipped} skipped.`)
    console.log('   Backups: keystore.json.pre-rotate.bak, .env.pre-rotate.bak')
    console.log('   Restart the backend to pick up the new SECRET_STORE_KEY.')
  } finally {
    if (prisma) await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Rotation failed:', err)
  process.exit(1)
})
