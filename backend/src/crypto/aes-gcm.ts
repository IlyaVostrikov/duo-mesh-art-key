// Shared AES-256-GCM + PBKDF2 primitives used by the keystore and by the
// KDF-migration / secret-rotation scripts. Keeping the key derivation and
// cipher parameters in one place prevents drift between the runtime keystore
// and the scripts that re-encrypt its data.

export interface EncryptedEntry {
  ciphertext: string // base64
  iv: string // base64
}

const PBKDF2_ITERATIONS = 600_000
const IV_BYTES = 12

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('hex')
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(new Uint8Array(bytes)).toString('base64')
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(b64, 'base64')])
}

/** Derive an AES-256-GCM key from a secret via PBKDF2 (SHA-256, 600k iter). */
export async function derivePbkdf2Key(
  secret: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<EncryptedEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv) }
}

export async function decryptString(key: CryptoKey, entry: EncryptedEntry): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(entry.iv) },
    key,
    base64ToBytes(entry.ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}
