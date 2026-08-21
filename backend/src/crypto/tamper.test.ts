import { describe, test, expect, beforeAll } from 'bun:test'
import { verifySignedExport, type SignedExport } from '@duo-mesh/verifier'
import { canonicalJSON } from './canonical'
import { sha256Hex, hashPayload } from './hash'
import { generateEd25519KeyPair, importPublicKey } from './keys'
import { signPayload, signDigest } from './sign'
import { mintSignedExport, type MintResult } from './__fixtures__'

describe('Art Key tamper detection', () => {
  let mint: MintResult

  beforeAll(async () => {
    mint = await mintSignedExport({ records: 3 })
  })

  // Verify against the ephemeral platform key mintSignedExport generated,
  // injected as the trust anchor (no committed private key).
  const verify = (data: SignedExport) =>
    verifySignedExport(data, { platformPubKey: mint.platformKey.publicKey })

  // ─── 0. Valid certificate passes ───

  test('валидный сертификат проходит', async () => {
    const result = await verify(mint.exportData)
    expect(result.verified).toBe(true)
  })

  // ─── Layer A: data tamper without hash recalc ───

  test('изменение поля → verified=false (Layer A)', async () => {
    const t = structuredClone(mint.exportData)
    t.provenance[0].payload.toOwner = 'FORGED'
    const result = await verify(t)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'INTEGRITY' && !c.pass)).toBe(true)
  })

  // ─── Layer A: hash recalc on one record breaks the chain ───

  test('пересчёт хеша записи рвёт цепочку', async () => {
    const t = structuredClone(mint.exportData)
    t.provenance[0].payload.toOwner = 'FORGED'

    // Recalculate recordHash for the tampered record
    const newHash = await sha256Hex(canonicalJSON(t.provenance[0].payload))
    t.provenance[0].recordHash = newHash
    // prevRecordHash in the next non-co-sig record (index 2) still points to old hash

    const result = await verify(t)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'CHAIN' && !c.pass)).toBe(true)
  })

  // ─── Layer B: full re-chain without private key ───

  test('полная пере-сборка цепочки всё равно падает (нет приватного ключа)', async () => {
    const t = structuredClone(mint.exportData)

    // Tamper genesis payload
    t.provenance[0].payload.toOwner = 'FORGED'

    // Also tamper the platform co-sig (it has the same payload)
    t.provenance[1].payload.toOwner = 'FORGED'

    // Re-chain: recalculate all hashes and fix prevRecordHash links
    rechainAll(t)

    const result = await verify(t)
    // CRITICAL: signatures were made over old hashes, so Ed25519 must reject them
    expect(result.verified).toBe(false)

    const sigFails = result.checks.filter((c) => c.category === 'SIGNATURE' && !c.pass)
    expect(sigFails.length).toBeGreaterThan(0)
  })

  // ─── Reorder records ───

  test('перестановка записей → false', async () => {
    const t = structuredClone(mint.exportData)
    // Swap genesis and the first transfer (skip co-sig at index 1)
    ;[t.provenance[0], t.provenance[2]] = [t.provenance[2], t.provenance[0]]

    const result = await verify(t)
    expect(result.verified).toBe(false)
  })

  // ─── Delete a record ───

  test('удаление записи → false', async () => {
    // Build a longer chain (4 records → 5 entries with platform co-sig)
    // so deleting a middle record breaks the prevRecordHash link.
    const long = await mintSignedExport({ records: 4 })
    const t = structuredClone(long.exportData)
    // Remove the first transfer (index 2, after genesis + platform co-sig)
    // This breaks the chain: the next transfer's prevRecordHash points to the deleted record
    t.provenance.splice(2, 1)

    const result = await verifySignedExport(t, { platformPubKey: long.platformKey.publicKey })
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'CHAIN' && !c.pass)).toBe(true)
  })

  // ─── Flip one byte in signature ───

  test('порча байта подписи → false', async () => {
    const t = structuredClone(mint.exportData)
    t.provenance[0].signature = flipOneHexByte(t.provenance[0].signature!)

    const result = await verify(t)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'SIGNATURE' && !c.pass)).toBe(true)
  })

  // ─── Substitute public key ───

  test('подмена публичного ключа → false', async () => {
    const t = structuredClone(mint.exportData)
    const otherKp = await generateEd25519KeyPair()
    t.provenance[0].signerPublicKey = otherKp.publicKey

    const result = await verify(t)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'SIGNATURE' && !c.pass)).toBe(true)
  })

  // ─── Trust anchor: attacker swaps artist key + re-signs everything ───

  test('подмена ключа художника + переподпись своим ключом → false', async () => {
    const t = structuredClone(mint.exportData)
    const evil = await generateEd25519KeyPair()

    // Replace artist identity
    t.artist.publicKey = evil.publicKey

    // Replace signerPublicKey on all records
    for (const entry of t.provenance) {
      entry.signerPublicKey = evil.publicKey
    }

    // Re-chain and re-sign everything under the evil key
    await rechainAndResignAll(t, evil.privateKey)

    const result = await verify(t)
    // Must fail: platform co-signature is checked against PINNED key,
    // and the evil key doesn't match the pinned platform key
    expect(result.verified).toBe(false)

    const platformCheck = result.checks.find(
      (c) => c.category === 'SIGNATURE' && c.detail.includes('pinned'),
    )
    expect(platformCheck?.pass).toBe(false)
  })

  // ─── Trust anchor: platform key must be pinned, not read from document ───

  test('платформенный ключ берётся из пиннинга, а не из документа', async () => {
    const t = structuredClone(mint.exportData)
    const evil = await generateEd25519KeyPair()

    // Attacker replaces the platform public key in the document
    t.platform.publicKey = evil.publicKey

    // If the verifier reads platform.publicKey from the document,
    // this would be a catastrophic hole.
    // The verifier must use the PINNED key instead.
    const result = await verify(t)
    expect(result.verified).toBe(true)

    // The platform signature still verifies against the pinned key
    const platformCheck = result.checks.find(
      (c) => c.category === 'SIGNATURE' && c.detail.includes('pinned'),
    )
    expect(platformCheck?.pass).toBe(true)
  })
})

// ─── Helpers ───

/**
 * Recalculate all recordHashes and fix prevRecordHash links so Layer A
 * is internally consistent. Does NOT re-sign — signatures stay stale.
 */
async function rechainAll(data: SignedExport): Promise<void> {
  let chainHash = data.artKey.integrityHash

  for (let i = 0; i < data.provenance.length; i++) {
    const entry = data.provenance[i]

    // Co-signature detection: same prevRecordHash as the previous record
    const isCoSig =
      i > 0 &&
      entry.payload.prevRecordHash === data.provenance[i - 1].payload.prevRecordHash

    if (!isCoSig) {
      // This is a chain link — fix its prevRecordHash
      entry.payload.prevRecordHash = chainHash
    } else {
      // Co-sig: copy the updated prevRecordHash from the record it co-signs
      entry.payload.prevRecordHash = data.provenance[i - 1].payload.prevRecordHash
    }

    // Recalculate this record's hash from its (possibly tampered) payload
    entry.recordHash = await sha256Hex(canonicalJSON(entry.payload))

    if (!isCoSig) {
      chainHash = entry.recordHash
    }
  }
}

/** Invert one hex character in a signature string (0→f, f→0, etc.). */
function flipOneHexByte(hex: string): string {
  const chars = '0123456789abcdef'
  const pos = 10 // arbitrary position, safely within hex string
  const current = hex[pos]!.toLowerCase()
  const flipped = chars[(chars.indexOf(current) + 8) % 16]!
  return hex.slice(0, pos) + flipped + hex.slice(pos + 1)
}

/**
 * Re-chain and re-sign all records with a new private key.
 * After this, Layer A (hashes) and Layer B (signatures) are both
 * internally consistent under the new key — but the platform co-signature
 * is NOT from the pinned key, so verification must still fail.
 */
async function rechainAndResignAll(
  data: SignedExport,
  newPrivateKey: string,
): Promise<void> {
  let chainHash = data.artKey.integrityHash

  for (let i = 0; i < data.provenance.length; i++) {
    const entry = data.provenance[i]

    const isCoSig =
      i > 0 &&
      entry.payload.prevRecordHash === data.provenance[i - 1].payload.prevRecordHash

    if (!isCoSig) {
      entry.payload.prevRecordHash = chainHash
    } else {
      entry.payload.prevRecordHash = data.provenance[i - 1].payload.prevRecordHash
    }

    // Re-sign with the new key
    const { recordHash, signature } = await signPayload(newPrivateKey, entry.payload)
    entry.recordHash = recordHash
    entry.signature = signature

    if (!isCoSig) {
      chainHash = recordHash
    }
  }
}
