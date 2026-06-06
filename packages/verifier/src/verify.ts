/**
 * Offline Provenance Verifier
 *
 * Verifies a signed ArtKey export JSON without trusting the server.
 * Uses only Web Crypto API — works in Bun, Node.js 19+, and browsers.
 *
 * Usage:
 *   bun run src/index.ts ./export.json
 *   node src/index.mjs ./export.json
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
  verificationHints?: {
    canonicalization: string
    hashing: string
    signature: string
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

export interface VerificationResult {
  verified: boolean
  checks: CheckResult[]
  chainLength: number
}

// ── Canonical JSON ──

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
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

// ── Main verification ──

export async function verifySignedExport(data: SignedExport): Promise<VerificationResult> {
  const checks: CheckResult[] = []

  // ── Verify provenance chain ──

  let chainHash = ''  // recordHash of the last chain link

  for (let i = 0; i < data.provenance.length; i++) {
    const entry = data.provenance[i]
    const payload = { ...entry.payload }
    const computedHash = await sha256Hex(canonicalJSON(payload))

    // Integrity: hash matches
    const hashMatch = computedHash === entry.recordHash
    checks.push({
      category: 'INTEGRITY',
      pass: hashMatch,
      detail: hashMatch
        ? `Record #${i + 1}: hash matches`
        : `Record #${i + 1}: hash mismatch — expected ${entry.recordHash}, computed ${computedHash}`,
    })

    // Co-signatures share the same prevRecordHash as the record they endorse.
    // Only check chain continuity when prevRecordHash changes (a new link).
    const isCoSig =
      i > 0 && entry.payload.prevRecordHash === data.provenance[i - 1].payload.prevRecordHash

    if (i > 0 && !isCoSig) {
      const chainOk = entry.payload.prevRecordHash === chainHash
      checks.push({
        category: 'CHAIN',
        pass: chainOk,
        detail: chainOk
          ? `Record #${i + 1}: chain link to record #${i} valid`
          : `Record #${i + 1}: chain broken — expected prevRecordHash=${chainHash}, got ${entry.payload.prevRecordHash}`,
      })
    }
    if (!isCoSig) {
      chainHash = entry.recordHash
    }

    // Signature: Ed25519 over hash
    if (entry.signature && entry.signerPublicKey) {
      const sigValid = await verifyEd25519(entry.signerPublicKey, entry.signature, entry.recordHash)
      checks.push({
        category: 'SIGNATURE',
        pass: sigValid,
        detail: sigValid
          ? `Record #${i + 1}: valid ${entry.signerRole} signature`
          : `Record #${i + 1}: invalid ${entry.signerRole} signature`,
      })
    } else if (!entry.signature) {
      checks.push({
        category: 'SIGNATURE',
        pass: false,
        detail: `Record #${i + 1}: unsigned (LEGACY record)`,
      })
    }
  }

  // ── Platform co-signature: verify against PINNED key (not document) ──

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

  const verified = checks.every((c) => c.pass)

  return { verified, checks, chainLength: data.provenance.length }
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
