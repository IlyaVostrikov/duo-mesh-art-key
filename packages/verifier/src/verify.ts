/**
 * Offline Provenance Verifier
 *
 * Verifies a signed ArtKey export JSON without trusting the server.
 * Uses only Web Crypto API — works in Bun, Node.js 19+, and browsers.
 *
 * Export v2.0.0+: payload contains owner IDs (not display names).
 * See presentation.provenance for human-readable names.
 */

// ── Types ──

export interface SignedExport {
  version: string
  exportedAt: string
  artKey: {
    keyCode: string
    integrityHash: string
    timestampToken: string | null
    platformSignature: string | null
  }
  artist: {
    id: string
    displayName: string
    publicKey: string | null
  }
  platform: {
    publicKey: string | null
  }
  provenance: ProvenanceEntry[]
  presentation?: {
    provenance?: Array<{
      sequence: number
      transferType: string
      fromOwnerName: string | null
      toOwnerName: string | null
      price: string | null
      createdAt: string
    }>
  }
  verificationHints?: {
    canonicalization: string
    hashing: string
    signature: string
    note?: string
  }
}

export interface ProvenanceEntry {
  payload: Record<string, unknown>
  recordHash: string
  signature: string | null
  signerPublicKey: string | null
  signerRole: string | null
}

export interface CheckResult {
  category: 'INTEGRITY' | 'CHAIN' | 'SIGNATURE'
  pass: boolean
  detail: string
}

export type VerificationStatus = 'valid' | 'invalid' | 'indeterminate' | 'unsupported-version'

export interface VerificationResult {
  status: VerificationStatus
  verified: boolean  // convenience: true only when status === 'valid'
  checks: CheckResult[]
  chainLength: number
}

// ── Recursive canonical JSON (RFC 8785 / JCS-style) ──

function canonicalJSON(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  // Object — sort keys alphabetically, recurse into values
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize((value as Record<string, unknown>)[key])
      return acc
    }, {})

  return sorted
}

// ── SHA-256 ──

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder().encode(data)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return bufferToHex(hash)
}

// ── Ed25519 verification ──

const ED25519 = { name: 'Ed25519' }

async function importEd25519PublicKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBuffer(hex), ED25519, true, ['verify'])
}

async function verifyEd25519(
  publicKeyHex: string,
  signatureHex: string,
  digestHex: string,
): Promise<boolean> {
  try {
    const key = await importEd25519PublicKey(publicKeyHex)
    return crypto.subtle.verify(ED25519, key, hexToBuffer(signatureHex), hexToBuffer(digestHex))
  } catch {
    return false
  }
}

// ── Trust anchor: pinned DUO MESH platform public key ──
// This key is the root of trust. The verifier checks that at least one
// provenance record carries a valid Ed25519 signature from THIS key.
// The `platform.publicKey` field in the export is informational only
// and MUST NOT be used for verification.
/** Pinned DUO MESH platform public key — the root of trust. */
export const DUO_MESH_PLATFORM_PUBKEY = '3ac4ff474fe8dc1825e53d7c92c3125dde8cf82eebabd29b96ad94de5cdce871'

// ── Supported export versions ──

const SUPPORTED_VERSIONS = new Set(['1.0.0', '2.0.0'])

// ── Main verification ──

export async function verifySignedExport(data: SignedExport): Promise<VerificationResult> {
  const checks: CheckResult[] = []

  // Version check
  if (!SUPPORTED_VERSIONS.has(data.version)) {
    return {
      status: 'unsupported-version',
      verified: false,
      checks: [{
        category: 'INTEGRITY',
        pass: false,
        detail: `Unsupported export version: ${data.version}. Supported: ${[...SUPPORTED_VERSIONS].join(', ')}`,
      }],
      chainLength: data.provenance.length,
    }
  }

  // Empty provenance = indeterminate
  if (data.provenance.length === 0) {
    return {
      status: 'indeterminate',
      verified: false,
      checks: [{
        category: 'CHAIN',
        pass: false,
        detail: 'No provenance records — cannot verify',
      }],
      chainLength: 0,
    }
  }

  // ── Verify provenance chain ──

  let chainHash = ''  // recordHash of the last chain link
  let allHashesMatch = true
  let allSigsValid = true
  let chainIntact = true
  let hasRequiredSigs = true

  for (let i = 0; i < data.provenance.length; i++) {
    const entry = data.provenance[i]
    const payload = { ...entry.payload }
    const computedHash = await sha256Hex(canonicalJSON(payload))

    // Integrity: hash matches
    const hashMatch = computedHash === entry.recordHash
    if (!hashMatch) allHashesMatch = false
    checks.push({
      category: 'INTEGRITY',
      pass: hashMatch,
      detail: hashMatch
        ? `Record #${i + 1}: hash matches`
        : `Record #${i + 1}: hash mismatch — stored ${entry.recordHash.slice(0, 16)}…, computed ${computedHash.slice(0, 16)}…`,
    })

    // Co-signatures share the same prevRecordHash as the record they endorse.
    const isCoSig =
      i > 0 && entry.payload.prevRecordHash === data.provenance[i - 1].payload.prevRecordHash

    if (i > 0 && !isCoSig) {
      const chainOk = entry.payload.prevRecordHash === chainHash
      if (!chainOk) chainIntact = false
      checks.push({
        category: 'CHAIN',
        pass: chainOk,
        detail: chainOk
          ? `Record #${i + 1}: chain link to record #${i} valid`
          : `Record #${i + 1}: chain broken — expected prevRecordHash=${chainHash.slice(0, 16)}…, got ${String(entry.payload.prevRecordHash).slice(0, 16)}…`,
      })
    }
    if (!isCoSig) {
      chainHash = entry.recordHash
    }

    // Signature: Ed25519 over hash
    if (entry.signature && entry.signerPublicKey) {
      const sigValid = await verifyEd25519(entry.signerPublicKey, entry.signature, entry.recordHash)
      if (!sigValid) allSigsValid = false
      checks.push({
        category: 'SIGNATURE',
        pass: sigValid,
        detail: sigValid
          ? `Record #${i + 1}: valid ${entry.signerRole} signature`
          : `Record #${i + 1}: invalid ${entry.signerRole} signature`,
      })
    } else if (!entry.signature) {
      hasRequiredSigs = false
      checks.push({
        category: 'SIGNATURE',
        pass: false,
        detail: `Record #${i + 1}: unsigned (LEGACY record)`,
      })
    }
  }

  // ── Platform co-signature: verify against PINNED key ──

  let platformCoSignatureValid = false
  for (const entry of data.provenance) {
    if (entry.signerRole === 'PLATFORM' && entry.signature) {
      const pinnedValid = await verifyEd25519(
        DUO_MESH_PLATFORM_PUBKEY,
        entry.signature,
        entry.recordHash,
      )
      if (pinnedValid) {
        platformCoSignatureValid = true
        break
      }
    }
  }

  checks.push({
    category: 'SIGNATURE',
    pass: platformCoSignatureValid,
    detail: platformCoSignatureValid
      ? 'Platform co-signature verified against pinned DUO MESH key'
      : 'No valid platform co-signature against pinned DUO MESH key — provenance may be self-signed',
  })

  // ── Trust model notes ──

  checks.push({
    category: 'INTEGRITY',
    pass: true,
    detail:
      'NOTE: integrityHash links to artwork files only if the verifier has access to the files. Without files, this verifies only that the hash-chain is self-consistent.',
  })

  // ── Determine status ──

  const structuralOk = allHashesMatch && chainIntact
  const cryptoOk = allSigsValid && platformCoSignatureValid

  let status: VerificationStatus
  if (structuralOk && cryptoOk && hasRequiredSigs) {
    status = 'valid'
  } else if (!structuralOk || !hasRequiredSigs) {
    // Structural or missing-sig failures = definitively invalid
    status = 'invalid'
  } else {
    // Structural ok but crypto fails (signature invalid or platform not verified)
    status = 'invalid'
  }

  return { status, verified: status === 'valid', checks, chainLength: data.provenance.length }
}

// ── Hex utilities (zero dependencies) ──

function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  const len = hex.length / 2
  const arr: number[] = []
  for (let i = 0; i < len; i++) {
    arr.push(parseInt(hex.substring(i * 2, i * 2 + 2), 16))
  }
  return new Uint8Array(arr)
}

function bufferToHex(buf: ArrayBuffer): string {
  return new Uint8Array(buf).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
}
