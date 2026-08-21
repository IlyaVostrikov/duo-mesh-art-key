import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'node:crypto'
import { KeyStore } from './keystore'

// ── Test fixtures ──

const SECRET_KEY = 'test-secret-store-key-minimum-32'
// Opaque blob — KeyStore only encrypts/decrypts this string, never parses it as
// a key. Deliberately NOT a real private key.
const TEST_PRIVKEY_HEX = 'a'.repeat(96)

let tmpDir: string
let storePath: string
let saltPath: string

function createKeystore(): KeyStore {
  return new KeyStore(storePath, SECRET_KEY)
}

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'keystore-test-'))
  storePath = join(tmpDir, 'keystore.json')
  saltPath = storePath.replace(/\.json$/, '.salt')

  // Generate a random 32-byte salt (hex = 64 chars)
  const salt = crypto.randomBytes(32).toString('hex')
  writeFileSync(saltPath, salt)
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Full encrypt/decrypt cycle ───

describe('KeyStore encrypt/decrypt cycle', () => {
  test('stores and retrieves a private key', async () => {
    const ks = createKeystore()
    await ks.set('key-001', TEST_PRIVKEY_HEX)
    const retrieved = await ks.get('key-001')
    expect(retrieved).toBe(TEST_PRIVKEY_HEX)
  })

  test('throws on missing key', async () => {
    const ks = createKeystore()
    let err: Error | null = null
    try { await ks.get('nonexistent') } catch (e) { err = e as Error }
    expect(err).not.toBeNull()
    expect(err!.message).toContain('not found')
  })

  test('has() returns false before set and true after', async () => {
    const ks = createKeystore()
    expect(await ks.has('key-has-test')).toBe(false)
    await ks.set('key-has-test', TEST_PRIVKEY_HEX)
    expect(await ks.has('key-has-test')).toBe(true)
  })
})

// ─── Entry-level operations (for DB persistence) ───

describe('KeyStore entry-level ops', () => {
  test('getEntry returns the raw encrypted entry with 12-byte IV', async () => {
    const ks = createKeystore()
    await ks.set('raw-entry-key', TEST_PRIVKEY_HEX)
    const entry = await ks.getEntry('raw-entry-key')
    expect(entry).not.toBeNull()
    expect(entry!.ciphertext).toBeString()
    expect(entry!.iv).toBeString()
    const ivBytes = Buffer.from(entry!.iv, 'base64')
    expect(ivBytes).toHaveLength(12)
  })

  test('getEntry returns null for missing key', async () => {
    const ks = createKeystore()
    expect(await ks.getEntry('no-such-entry')).toBeNull()
  })

  test('setEntry restores a pre-encrypted entry for DB recovery', async () => {
    const ks1 = createKeystore()
    await ks1.set('recovery-key', TEST_PRIVKEY_HEX)
    const entry = await ks1.getEntry('recovery-key')

    // Simulate DB recovery: create a fresh keystore and restore the entry
    const ks2 = createKeystore()
    await ks2.setEntry('recovery-key', entry!)
    expect(await ks2.get('recovery-key')).toBe(TEST_PRIVKEY_HEX)
  })
})

// ─── Delete ───

describe('KeyStore delete', () => {
  test('removes a key from the store', async () => {
    const ks = createKeystore()
    await ks.set('delete-me', TEST_PRIVKEY_HEX)
    expect(await ks.has('delete-me')).toBe(true)
    await ks.delete('delete-me')
    expect(await ks.has('delete-me')).toBe(false)
  })

  test('delete of nonexistent key is a no-op', async () => {
    const ks = createKeystore()
    await ks.delete('never-existed')
    // Should not throw
  })
})

// ─── Persistence across instances ───

describe('KeyStore persistence', () => {
  test('keys survive destruction and recreation of the KeyStore object', async () => {
    const ks1 = createKeystore()
    await ks1.set('persistent-key', TEST_PRIVKEY_HEX)

    const ks2 = createKeystore()
    expect(await ks2.get('persistent-key')).toBe(TEST_PRIVKEY_HEX)
  })

  test('encrypted data is not plaintext on disk', async () => {
    const ks = createKeystore()
    await ks.set('encrypted-check', TEST_PRIVKEY_HEX)

    const raw = await Bun.file(storePath).text()
    const parsed = JSON.parse(raw)
    expect(parsed['encrypted-check'].ciphertext).not.toBe(TEST_PRIVKEY_HEX)
    expect(raw).not.toContain(TEST_PRIVKEY_HEX)
  })
})

// ─── Error handling ───

describe('KeyStore error handling', () => {
  test('throws descriptive error when salt file is missing', async () => {
    const missingSaltDir = join(tmpDir, 'missing-salt')
    mkdirSync(missingSaltDir, { recursive: true })
    const badPath = join(missingSaltDir, 'keystore.json')

    const ks = new KeyStore(badPath, SECRET_KEY)
    let err: Error | null = null
    try {
      await ks.set('k', 'aa'.repeat(32))
    } catch (e) {
      err = e as Error
    }
    expect(err).not.toBeNull()
    expect(err!.message).toContain('salt file not found')
  })
})

// ─── Write-lock recovery ───

describe('KeyStore write-lock', () => {
  test('a rejected read does not poison subsequent writes', async () => {
    const ks = createKeystore()
    let err: Error | null = null
    try {
      await ks.get('does-not-exist')
    } catch (e) {
      err = e as Error
    }
    expect(err).not.toBeNull()

    // The failed read must not leave the write lock in a rejected state.
    await ks.set('after-failed-read', TEST_PRIVKEY_HEX)
    expect(await ks.get('after-failed-read')).toBe(TEST_PRIVKEY_HEX)
  })
})

// ─── Key warm-up ───

describe('KeyStore warmKey', () => {
  test('resolves when the salt exists', async () => {
    const ks = createKeystore()
    await ks.warmKey()
  })

  test('rejects when the salt file is missing', async () => {
    const missingSaltDir = join(tmpDir, 'warmkey-missing-salt')
    mkdirSync(missingSaltDir, { recursive: true })
    const ks = new KeyStore(join(missingSaltDir, 'keystore.json'), SECRET_KEY)
    let err: Error | null = null
    try {
      await ks.warmKey()
    } catch (e) {
      err = e as Error
    }
    expect(err).not.toBeNull()
    expect(err!.message).toContain('salt file not found')
  })
})
