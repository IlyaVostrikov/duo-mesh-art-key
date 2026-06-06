import { importPrivateKey } from './keys'
import { hashPayload } from './hash'

/**
 * Sign a SHA-256 hex digest with an Ed25519 private key.
 * Returns the hex-encoded signature (64 bytes → 128 hex chars).
 */
export async function signDigest(
  privateKeyHex: string,
  digestHex: string,
): Promise<string> {
  const key = await importPrivateKey(privateKeyHex)
  const digestBytes = hexToBuffer(digestHex)
  const signature = await crypto.subtle.sign(ED25519_ALG.name, key, digestBytes)
  return bufferToHex(signature)
}

/** Sign a provenance payload: hash canonical JSON, then sign the hash. */
export async function signPayload(
  privateKeyHex: string,
  payload: Record<string, unknown>,
): Promise<{ recordHash: string; signature: string }> {
  const recordHash = hashPayload(payload)
  const signature = await signDigest(privateKeyHex, recordHash)
  return { recordHash, signature }
}

// ── internal ──

const ED25519_ALG = { name: 'Ed25519' } as const

function bufferToHex(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('hex')
}

function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}
