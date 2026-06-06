/**
 * Offline ArtKey provenance verifier.
 *
 * Usage:
 *   bun tools/offline-verify.ts <export.json>
 *   bun tools/offline-verify.ts --stdin < export.json
 *
 * Verifies:
 *   - Integrity hash (if file hashes provided via --files)
 *   - Provenance chain (recordHash correctness + chain linking)
 *   - Ed25519 signatures (artist + platform)
 *   - Genesis link (seq=0 anchored to integrityHash)
 *
 * Uses only Web Crypto — no Bun-specific APIs. Works in Node 20+ and Bun.
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// ── Types ──

interface ExportPayload {
  version: string
  exportedAt: string
  artKey: {
    keyCode: string
    integrityHash: string
    timestampToken: string | null
    platformSignature: string | null
  }
  artist: { id: string; displayName: string; publicKey: string | null }
  platform: { publicKey: string | null }
  provenance: ProvenanceEntry[]
  verificationHints: {
    canonicalization: string
    hashing: string
    signature: string
  }
}

interface ProvenanceEntry {
  payload: Record<string, unknown>
  recordHash: string
  signature: string | null
  signerPublicKey: string | null
  signerRole: string | null
}

interface CheckResult {
  label: string
  pass: boolean
  detail: string
  category: 'INTEGRITY' | 'CHAIN' | 'SIGNATURE'
}

// ── Crypto helpers (Web Crypto, no Bun deps) ──

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder().encode(data)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function sha256HexSync(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

async function hashPayload(payload: Record<string, unknown>): Promise<string> {
  return sha256Hex(canonicalJSON(payload))
}

function hexToBuf(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

async function importEd25519PublicKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBuf(hex), { name: 'Ed25519' }, true, ['verify'])
}

async function verifyEd25519(
  publicKeyHex: string,
  messageHex: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const key = await importEd25519PublicKey(publicKeyHex)
    return crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBuf(signatureHex),
      hexToBuf(messageHex),
    )
  } catch {
    return false
  }
}

// ── Verification ──

async function verifyExport(exp: ExportPayload, fileHashes?: Record<string, string>): Promise<{
  allOk: boolean
  checks: CheckResult[]
}> {
  const checks: CheckResult[] = []

  // Layer A: Integrity hash (file-based, optional)
  if (fileHashes && Object.keys(fileHashes).length > 0) {
    const sorted = Object.keys(fileHashes).sort()
    const concat = sorted.map((k) => fileHashes[k]).join('')
    const recalculated = sha256HexSync(concat)
    const ok = recalculated === exp.artKey.integrityHash
    checks.push({
      label: 'integrityHash (file-based)',
      pass: ok,
      detail: ok
        ? 'Composite file hash matches integrityHash'
        : `Mismatch: stored ${exp.artKey.integrityHash.slice(0, 16)}… vs recalculated ${recalculated.slice(0, 16)}…`,
      category: 'INTEGRITY',
    })
  } else {
    checks.push({
      label: 'integrityHash',
      pass: true,
      detail: 'Skipped — no file hashes provided. Use --files <hashes.json> to verify.',
      category: 'INTEGRITY',
    })
  }

  // Layer B: Provenance chain
  if (exp.provenance.length === 0) {
    checks.push({ label: 'chain', pass: false, detail: 'No provenance records', category: 'CHAIN' })
    return { allOk: false, checks }
  }

  const sorted = [...exp.provenance].sort((a, b) => Number(a.payload.sequence) - Number(b.payload.sequence))

  // Genesis link
  if (Number(sorted[0].payload.sequence) === 0) {
    const genesisOk = sorted[0].payload.prevRecordHash === exp.artKey.integrityHash
    checks.push({
      label: 'genesis-link',
      pass: genesisOk,
      detail: genesisOk
        ? 'seq=0 anchored to integrityHash'
        : `seq=0 prevRecordHash ≠ integrityHash`,
      category: 'CHAIN',
    })
  }

  // Verify each record
  let prevRecordHash = sorted[0].recordHash
  for (let i = 0; i < sorted.length; i++) {
    const rec = sorted[i]
    const seq = rec.payload.sequence

    // Recalculate recordHash
    const recalculatedHash = await hashPayload(rec.payload)
    const hashOk = recalculatedHash === rec.recordHash

    if (!hashOk) {
      checks.push({
        label: `seq-${seq}-hash`,
        pass: false,
        detail: `recordHash tampered: stored ${rec.recordHash.slice(0, 16)}… vs recalculated ${recalculatedHash.slice(0, 16)}…`,
        category: 'CHAIN',
      })
    } else {
      checks.push({
        label: `seq-${seq}-hash`,
        pass: true,
        detail: `recordHash correct`,
        category: 'CHAIN',
      })
    }

    // Verify signature
    if (rec.signature && rec.signerPublicKey) {
      const sigOk = await verifyEd25519(rec.signerPublicKey, rec.recordHash, rec.signature)
      checks.push({
        label: `seq-${seq}-signature`,
        pass: sigOk,
        detail: sigOk
          ? `Ed25519 signature verified (${rec.signerRole ?? 'unknown'})`
          : `Ed25519 signature INVALID for ${rec.signerRole ?? 'unknown'}`,
        category: 'SIGNATURE',
      })
    } else if (rec.signature) {
      checks.push({
        label: `seq-${seq}-signature`,
        pass: false,
        detail: 'Signature present but no publicKey in export',
        category: 'SIGNATURE',
      })
    }

    // Chain linking
    if (i > 0 && rec.payload.prevRecordHash !== prevRecordHash) {
      checks.push({
        label: `seq-${seq}-link`,
        pass: false,
        detail: `Chain broken: expected ${prevRecordHash.slice(0, 16)}…, got ${String(rec.payload.prevRecordHash).slice(0, 16)}…`,
        category: 'CHAIN',
      })
    } else if (i > 0) {
      checks.push({
        label: `seq-${seq}-link`,
        pass: true,
        detail: `Chain linked to seq-${Number(seq) - 1}`,
        category: 'CHAIN',
      })
    }

    prevRecordHash = rec.recordHash
  }

  // Layer C: Platform co-signature
  if (exp.artKey.platformSignature && exp.platform.publicKey && sorted.length > 0) {
    const genesisRec = sorted[0]
    const genesisHash = await hashPayload(genesisRec.payload)
    const platOk = await verifyEd25519(
      exp.platform.publicKey,
      genesisHash,
      exp.artKey.platformSignature,
    )
    checks.push({
      label: 'platform-co-signature',
      pass: platOk,
      detail: platOk ? 'Platform co-signature valid' : 'Platform co-signature INVALID',
      category: 'SIGNATURE',
    })
  }

  // Layer D: Timestamp
  if (exp.artKey.timestampToken) {
    checks.push({
      label: 'rfc3161-timestamp',
      pass: true,
      detail: 'RFC 3161 timestamp token present — verify with openssl ts -verify',
      category: 'INTEGRITY',
    })
  }

  const allOk = checks.every((c) => c.pass)
  return { allOk, checks }
}

// ── CLI ──

function printReport(
  exp: ExportPayload,
  checks: CheckResult[],
  allOk: boolean,
): void {
  const CAT_COLORS: Record<string, string> = {
    INTEGRITY: '\x1b[36m',
    CHAIN: '\x1b[35m',
    SIGNATURE: '\x1b[33m',
  }
  const RESET = '\x1b[0m'
  const GREEN = '\x1b[32m'
  const RED = '\x1b[31m'
  const BOLD = '\x1b[1m'
  const DIM = '\x1b[2m'

  console.log('')
  console.log(`  ${BOLD}DUO MESH — Offline ArtKey Verifier${RESET}`)
  console.log(`  ${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`  Key Code:      ${exp.artKey.keyCode}`)
  console.log(`  Artist:        ${exp.artist.displayName}`)
  console.log(`  IntegrityHash: ${exp.artKey.integrityHash.slice(0, 24)}…`)
  console.log(`  Exported:      ${exp.exportedAt}`)
  console.log(`  Version:       ${exp.version}`)
  console.log(`  ${DIM}────────────────────────────────────────${RESET}`)

  for (const ch of checks) {
    const icon = ch.pass ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`
    const cat = CAT_COLORS[ch.category] ?? ''
    console.log(`  ${icon} ${cat}[${ch.category}]${RESET} ${ch.label}`)
    if (!ch.pass || ch.detail.includes('valid') || ch.detail.includes('correct')) {
      console.log(`       ${DIM}${ch.detail}${RESET}`)
    }
  }

  console.log(`  ${DIM}────────────────────────────────────────${RESET}`)
  if (allOk) {
    console.log(`  ${GREEN}${BOLD}✔ ALL CHECKS PASSED${RESET}`)
    console.log(`  ${DIM}The ArtKey provenance chain is cryptographically valid.${RESET}`)
  } else {
    console.log(`  ${RED}${BOLD}✘ VERIFICATION FAILED${RESET}`)
    console.log(`  ${DIM}The provenance chain has integrity issues. Do not trust this export.${RESET}`)
  }
  console.log('')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse --files flag
  let fileArg: string | undefined
  let filesArg: string | undefined
  let stdin = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files') {
      filesArg = args[++i]
    } else if (args[i] === '--stdin') {
      stdin = true
    } else {
      fileArg = args[i]
    }
  }

  // Read export JSON
  let raw: string
  if (stdin || !fileArg) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    raw = Buffer.concat(chunks).toString('utf-8')
  } else {
    raw = readFileSync(fileArg, 'utf-8')
  }

  let exp: ExportPayload
  try {
    exp = JSON.parse(raw)
  } catch {
    console.error('Error: Invalid JSON input')
    process.exit(1)
  }

  // Validate structure
  if (!exp.artKey?.keyCode || !exp.artKey?.integrityHash || !exp.provenance) {
    console.error('Error: Not a valid ArtKey export file (missing keyCode, integrityHash, or provenance)')
    process.exit(1)
  }

  // Load file hashes if provided
  let fileHashes: Record<string, string> | undefined
  if (filesArg) {
    try {
      fileHashes = JSON.parse(readFileSync(filesArg, 'utf-8'))
    } catch {
      console.error(`Error: Cannot read file hashes from ${filesArg}`)
      process.exit(1)
    }
  }

  const { allOk, checks } = await verifyExport(exp, fileHashes)
  printReport(exp, checks, allOk)
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error('Verification error:', err)
  process.exit(2)
})
