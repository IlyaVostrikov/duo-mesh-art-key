import { generateEd25519KeyPair } from './keys'
import { signPayload } from './sign'
import { hashPayload, compositeFileHash, sha256Hex } from './hash'
import type { SignedExport, ProvenanceEntry } from '@duo-mesh/verifier'

// The platform keypair is generated ephemerally per mint so no private key is
// committed. The verifier is invoked with the ephemeral public key as its trust
// anchor (see tamper.test.ts), so a "valid" fixture still round-trips.

export interface MintOptions {
  /** Number of provenance records (excluding co-signatures). Default 3. */
  records?: number
  /** The hash that the genesis record links back to. */
  integrityHash?: string
}

export interface MintResult {
  exportData: SignedExport
  artistKey: { publicKey: string; privateKey: string }
  platformKey: { publicKey: string; privateKey: string }
}

/**
 * Build a valid SignedExport using the REAL crypto primitives
 * that the minting pipeline (ArtKeyService + SigningService) uses.
 *
 * The platform co-signature is made with an ephemeral platform key.
 * Callers verify by injecting the ephemeral public key as the trust anchor:
 * `verifySignedExport(exportData, { platformPubKey: platformKey.publicKey })`.
 */
export async function mintSignedExport(opts: MintOptions = {}): Promise<MintResult> {
  const records = opts.records ?? 3
  const artistKp = await generateEd25519KeyPair()
  const platformKp = await generateEd25519KeyPair()

  const artworkId = '00000000-0000-4000-8000-000000000001'
  const integrityHash =
    opts.integrityHash ??
    compositeFileHash({ 'poster.png': sha256Hex('fake-poster-content') })

  const provenance: ProvenanceEntry[] = []
  const occurredAt = new Date().toISOString()

  // ── Genesis record ──
  const genesisPayload: Record<string, unknown> = {
    artworkId,
    sequence: 0,
    eventType: 'CREATION',
    fromOwner: null,
    toOwner: 'artist-1',
    occurredAt,
    prevRecordHash: integrityHash,
  }
  const genesis = await signPayload(artistKp.privateKey, genesisPayload)
  provenance.push({
    payload: genesisPayload,
    recordHash: genesis.recordHash,
    signature: genesis.signature,
    signerPublicKey: artistKp.publicKey,
    signerRole: 'ARTIST',
  })

  // ── Platform co-signature on genesis (ephemeral platform key) ──
  const platformSig = await signPayload(platformKp.privateKey, genesisPayload)
  provenance.push({
    payload: { ...genesisPayload },
    recordHash: platformSig.recordHash,
    signature: platformSig.signature,
    signerPublicKey: platformKp.publicKey,
    signerRole: 'PLATFORM',
  })

  // ── Subsequent transfer records ──
  let prevHash = genesis.recordHash
  for (let i = 1; i < records; i++) {
    const transferPayload: Record<string, unknown> = {
      artworkId,
      sequence: i,
      eventType: i === 1 ? 'PRIMARY_SALE' : 'TRANSFER',
      fromOwner: `owner-${i}`,
      toOwner: `owner-${i + 1}`,
      occurredAt: new Date(Date.now() + i * 1000).toISOString(),
      prevRecordHash: prevHash,
    }
    const signed = await signPayload(artistKp.privateKey, transferPayload)
    provenance.push({
      payload: transferPayload,
      recordHash: signed.recordHash,
      signature: signed.signature,
      signerPublicKey: artistKp.publicKey,
      signerRole: 'ARTIST',
    })
    prevHash = signed.recordHash
  }

  const exportData: SignedExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    artKey: {
      keyCode: 'DUO-2026-TEST-FIXTURE',
      integrityHash,
      timestampToken: null,
      platformSignature: platformSig.signature,
    },
    artist: {
      id: 'artist-1',
      displayName: 'Test Artist',
      publicKey: artistKp.publicKey,
    },
    platform: {
      publicKey: platformKp.publicKey,
    },
    provenance,
  }

  return {
    exportData,
    artistKey: artistKp,
    platformKey: platformKp,
  }
}
