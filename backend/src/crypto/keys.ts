const ED25519_ALG = { name: 'Ed25519' } as const

export interface Ed25519KeyPair {
  publicKey: string // hex-encoded, 32 bytes (raw SPKI) → 64 chars
  privateKey: string // hex-encoded, 48 bytes (PKCS#8 DER) → 96 chars
}

/** Generate a fresh Ed25519 keypair. */
export async function generateEd25519KeyPair(): Promise<Ed25519KeyPair> {
  const kp = (await crypto.subtle.generateKey(ED25519_ALG, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair

  const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey)
  // Bun WebCrypto does not support `raw` export for Ed25519 private keys.
  // Use `pkcs8` for storage — it includes the OID and is the interoperable format.
  const privPkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey)

  return {
    publicKey: bufferToHex(pubRaw),
    privateKey: bufferToHex(privPkcs8),
  }
}

/** Import a hex-encoded Ed25519 public key (raw 32 bytes). */
export async function importPublicKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBuffer(hex), ED25519_ALG, true, [
    'verify',
  ])
}

/** Import a hex-encoded Ed25519 private key (PKCS#8 format). */
export async function importPrivateKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    hexToBuffer(hex),
    ED25519_ALG,
    true,
    ['sign'],
  )
}

// ── hex helpers ──

function bufferToHex(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('hex')
}

function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...Buffer.from(hex, 'hex')])
}
