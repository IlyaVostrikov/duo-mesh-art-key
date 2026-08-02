import { readFile, writeFile } from 'node:fs/promises'

/**
 * Encrypted private-key store backed by a JSON file on disk.
 *
 * MVP custodial model: keys are encrypted at rest with AES-256-GCM.
 * The encryption key is derived via PBKDF2(SECRET_STORE_KEY, salt, 600k iter).
 * The salt lives in a file next to the keystore: <storePath>.salt
 * Roadmap: non-custodial (keys in browser, server only stores public keys).
 */

const PBKDF2_ITERATIONS = 600_000

export interface StoreEntry {
  ciphertext: string // base64
  iv: string // base64
}

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
  ) {}

  private async deriveKey(): Promise<CryptoKey> {
    const saltPath = this.storePath.replace(/\.json$/, '.salt')
    const saltHex = await readFile(saltPath, 'utf-8').catch(() => {
      throw new Error(
        `Keystore salt file not found at ${saltPath}. ` +
        'Run the KDF migration script first: bun run scripts/migrate-kdf.ts',
      )
    })
    const salt = hexToBytes(saltHex.trim())

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.secretStoreKey),
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

  /** Serialize write operations to prevent interleaved load/save races. */
  private enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(fn, fn)
    this.writeLock = next.then(() => {}) as Promise<void>
    return next
  }

  private async getKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey
    this.encryptionKey = this.deriveKey()
    return this.encryptionKey
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
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(privateKeyHex),
      )
      store[keyId] = {
        ciphertext: bytesToBase64(ciphertext),
        iv: bytesToBase64(iv),
      }
      await this.save()
    })
  }

  async get(keyId: string): Promise<string> {
    const store = await this.load()
    const entry = store[keyId]
    if (!entry) throw new Error(`KeyStore: key ${keyId} not found`)
    const key = await this.getKey()
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(entry.iv) },
      key,
      base64ToBytes(entry.ciphertext),
    )
    return new TextDecoder().decode(plaintext)
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

// ── helpers ──

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('base64')
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(b64, 'base64')])
}
