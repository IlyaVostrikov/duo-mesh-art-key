import { readFile, writeFile } from 'node:fs/promises'
import { derivePbkdf2Key, encryptString, decryptString, hexToBytes } from './aes-gcm'
import type { EncryptedEntry } from './aes-gcm'

/**
 * Encrypted private-key store backed by a JSON file on disk.
 *
 * MVP custodial model: keys are encrypted at rest with AES-256-GCM.
 * The encryption key is derived via PBKDF2(SECRET_STORE_KEY, salt, 600k iter).
 * The salt lives in a file next to the keystore: <storePath>.salt
 * Roadmap: non-custodial (keys in browser, server only stores public keys).
 */

export type StoreEntry = EncryptedEntry

interface StoreFile {
  [keyId: string]: StoreEntry
}

export class KeyStore {
  private store: StoreFile | null = null
  private encryptionKey: Promise<CryptoKey> | null = null
  private writeLock: Promise<void> = Promise.resolve()

  constructor(
    private storePath: string,
    private secretStoreKey: string,
    private saltHexOverride?: string,
  ) {}

  private async deriveKey(): Promise<CryptoKey> {
    const saltHex = this.saltHexOverride ?? (await this.readSaltFile())
    return derivePbkdf2Key(this.secretStoreKey, hexToBytes(saltHex.trim()))
  }

  private async readSaltFile(): Promise<string> {
    const saltPath = this.storePath.replace(/\.json$/, '.salt')
    return readFile(saltPath, 'utf-8').catch(() => {
      throw new Error(
        `Keystore salt file not found at ${saltPath}. ` +
        'Run the KDF migration script first: bun run scripts/migrate-kdf.ts',
      )
    })
  }

  /** Serialize write operations to prevent interleaved load/save races. */
  private enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(fn, fn)
    // The lock chain must always resolve: a rejected op (e.g. missing key) must
    // not leave `writeLock` as a rejected promise, which would surface as an
    // unhandled rejection and poison subsequent queued writes.
    this.writeLock = next.then(() => {}, () => {}) as Promise<void>
    return next
  }

  private async getKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey
    this.encryptionKey = this.deriveKey()
    return this.encryptionKey
  }

  /** Pre-derive the encryption key so the first sign/verify doesn't block on PBKDF2. */
  async warmKey(): Promise<void> {
    await this.getKey()
  }

  private async load(): Promise<StoreFile> {
    if (this.store) return this.store
    try {
      const raw = await readFile(this.storePath, 'utf-8')
      this.store = JSON.parse(raw) as StoreFile
    } catch {
      this.store = {}
    }
    return this.store
  }

  private async save(): Promise<void> {
    if (!this.store) return
    await writeFile(this.storePath, JSON.stringify(this.store, null, 2))
  }

  async set(keyId: string, privateKeyHex: string): Promise<void> {
    return this.enqueueWrite(async () => {
      const store = await this.load()
      const key = await this.getKey()
      store[keyId] = await encryptString(key, privateKeyHex)
      await this.save()
    })
  }

  async get(keyId: string): Promise<string> {
    return this.enqueueWrite(async () => {
      const store = await this.load()
      const entry = store[keyId]
      if (!entry) throw new Error(`KeyStore: key ${keyId} not found`)
      const key = await this.getKey()
      return decryptString(key, entry)
    })
  }

  /** Return the raw encrypted entry (for DB persistence). */
  async getEntry(keyId: string): Promise<StoreEntry | null> {
    const store = await this.load()
    return store[keyId] ?? null
  }

  /** Restore a pre-encrypted entry without re-encrypting (for DB recovery). */
  async setEntry(keyId: string, entry: StoreEntry): Promise<void> {
    return this.enqueueWrite(async () => {
      const store = await this.load()
      store[keyId] = entry
      await this.save()
    })
  }

  async delete(keyId: string): Promise<void> {
    return this.enqueueWrite(async () => {
      const store = await this.load()
      delete store[keyId]
      await this.save()
    })
  }

  async has(keyId: string): Promise<boolean> {
    const store = await this.load()
    return keyId in store
  }
}
