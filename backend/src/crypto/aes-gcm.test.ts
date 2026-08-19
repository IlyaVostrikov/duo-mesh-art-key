import { describe, expect, it } from 'bun:test'
import {
  hexToBytes,
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
  derivePbkdf2Key,
  encryptString,
  decryptString,
} from './aes-gcm'

const SECRET = 'test-secret-for-aes-gcm-tests'
const salt = new Uint8Array(32).fill(7)

describe('byte helpers', () => {
  it('hex round-trips', () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255])
    expect(Buffer.from(hexToBytes(bytesToHex(bytes))).equals(Buffer.from(bytes))).toBe(true)
  })

  it('base64 round-trips', () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255])
    expect(Buffer.from(base64ToBytes(bytesToBase64(bytes))).equals(Buffer.from(bytes))).toBe(true)
  })
})

describe('AES-GCM + PBKDF2', () => {
  it('encrypts and decrypts a plaintext', async () => {
    const key = await derivePbkdf2Key(SECRET, salt)
    const entry = await encryptString(key, 'hello world')
    expect(await decryptString(key, entry)).toBe('hello world')
  })

  it('a different secret cannot decrypt (verify-before-write property)', async () => {
    const key = await derivePbkdf2Key(SECRET, salt)
    const wrongKey = await derivePbkdf2Key('wrong-secret', salt)
    const entry = await encryptString(key, 'secret message')
    let err: Error | null = null
    try {
      await decryptString(wrongKey, entry)
    } catch (e) {
      err = e as Error
    }
    expect(err).not.toBeNull()
  })

  it('derivation is deterministic for the same secret and salt', async () => {
    const a = await derivePbkdf2Key(SECRET, salt)
    const b = await derivePbkdf2Key(SECRET, salt)
    const entry = await encryptString(a, 'deterministic')
    expect(await decryptString(b, entry)).toBe('deterministic')
  })
})
