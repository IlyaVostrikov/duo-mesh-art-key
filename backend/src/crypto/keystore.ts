import { readFile, writeFile } from 'node:fs/promises'
import { sha256Hex } from './hash'

/**
 * Encrypted private-key store backed by a JSON file on disk.
 *
 * MVP custodial model: keys are encrypted at rest with AES-256-GCM.
 * The encryption key is derived as SHA-256(SECRET_STORE_KEY).
 * Roadmap: non-custodial (keys in browser, server only stores public keys).
 */

interface StoreEntry {
  ciphertext: string // base64
  iv: string // base64
}

interface StoreFile {
  [keyId: string]: StoreEntry
}

export class KeyStore {
  private store: StoreFile | null = null
  private encryptionKey: Promise<CryptoKey> | null = null

  constructor(
    private storePath: string,
    secretStoreKey: string,
  ) {
    const keyBytes = hexToBytes(sha256Hex(secretStoreKey))
    this.encryptionKey = crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  private async getKey(): Promise<CryptoKey> {
    return this.encryptionKey!
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

  async delete(keyId: string): Promise<void> {
    const store = await this.load()
    delete store[keyId]
    await this.save()
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
