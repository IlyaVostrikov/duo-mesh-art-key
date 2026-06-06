import { generateEd25519KeyPair } from './keys'
import { signPayload } from './sign'
import { hashPayload, compositeFileHash, sha256Hex } from './hash'
import type { SignedExport, ProvenanceEntry } from '@duo-mesh/verifier'

// ── Pinned DUO MESH platform keypair (test) ──
// Public key is pinned in @duo-mesh/verifier — must match.
// Private key lives ONLY in the fixture (and real signing service), never in the verifier.
const PLATFORM_PUBKEY = '3ac4ff474fe8dc1825e53d7c92c3125dde8cf82eebabd29b96ad94de5cdce871'
const PLATFORM_PRIVKEY = '302e020100300506032b657004220420e084964ec8e0bb9f5cf6e9a7cb1372ceeef89b2272b38cec98cb57bcfb1924c3'

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
 * The platform co-signature is made with the PINNED platform key.
 * The verifier will only accept exports whose platform signature
 * validates against the pinned public key — self-signed exports are rejected.
 */
export async function mintSignedExport(opts: MintOptions = {}): Promise<MintResult> {
  const records = opts.records ?? 3
  const artistKp = await generateEd25519KeyPair()

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

  // ── Platform co-signature on genesis (PINNED key) ──
  const platformSig = await signPayload(PLATFORM_PRIVKEY, genesisPayload)
  provenance.push({
    payload: { ...genesisPayload },
    recordHash: platformSig.recordHash,
    signature: platformSig.signature,
    signerPublicKey: PLATFORM_PUBKEY,
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
      publicKey: PLATFORM_PUBKEY,
    },
    provenance,
  }

  return {
    exportData,
    artistKey: artistKp,
    platformKey: { publicKey: PLATFORM_PUBKEY, privateKey: PLATFORM_PRIVKEY },
  }
}
