import { importPublicKey } from './keys'
import { hashPayload } from './hash'

/**
 * Verify an Ed25519 signature over a SHA-256 hex digest.
 */
export async function verifyDigest(
  publicKeyHex: string,
  digestHex: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const key = await importPublicKey(publicKeyHex)
    return crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBuffer(signatureHex),
      hexToBuffer(digestHex),
    )
  } catch {
    return false
  }
}

/**
 * Verify a provenance record signature.
 * Recalculates recordHash from the canonical payload, then checks the signature.
 */
export async function verifyProvenanceSignature(
  payload: Record<string, unknown>,
  signatureHex: string,
  publicKeyHex: string,
): Promise<{ recordHash: string; valid: boolean }> {
  const recordHash = hashPayload(payload)
  const valid = await verifyDigest(publicKeyHex, recordHash, signatureHex)
  return { recordHash, valid }
}

// ── internal ──

function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}
