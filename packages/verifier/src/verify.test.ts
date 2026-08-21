import { describe, expect, test } from 'bun:test'
import { verifySignedExport, type SignedExport } from './verify'

/** Sign a payload with a CryptoKey, returning { recordHash, signature }. */
async function signPayload(
  key: CryptoKey,
  payload: Record<string, unknown>,
): Promise<{ recordHash: string; signature: string }> {
  const sorted = Object.keys(payload).sort().reduce<Record<string, unknown>>(
    (acc, k) => { acc[k] = (payload as Record<string, unknown>)[k]; return acc }, {},
  )
  const json = JSON.stringify(sorted)
  const hash = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)),
  ).toString('hex')
  const sig = Buffer.from(
    await crypto.subtle.sign({ name: 'Ed25519' }, key, Buffer.from(hash, 'hex')),
  ).toString('hex')
  return { recordHash: hash, signature: sig }
}

/** Generate an ephemeral platform keypair (no committed private key). */
async function generatePlatformKey(): Promise<{ privateKey: CryptoKey; publicKeyHex: string }> {
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const publicKeyHex = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex')
  return { privateKey: kp.privateKey, publicKeyHex }
}

/**
 * Integration test: uses the PINNED platform key + generated artist key
 * to build a provenance chain, then verifies with the offline verifier.
 */
describe('verifySignedExport', () => {
  test('verifies a valid signed provenance chain', async () => {
    // ── Generate Ed25519 keypair for artist ──
    const artistKp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const artistPubHex = Buffer.from(await crypto.subtle.exportKey('raw', artistKp.publicKey)).toString('hex')

    // ── Generate ephemeral platform keypair ──
    const { privateKey: platformPrivKey, publicKeyHex: platformPubHex } = await generatePlatformKey()

    // ── Build provenance chain ──
    const integrityHash = 'a'.repeat(64)
    const genesisPayload = {
      artworkId: 'aw_test',
      sequence: 1,
      eventType: 'GENESIS',
      fromOwner: null,
      toOwner: 'artist_1',
      occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: integrityHash,
    }
    const genesis = await signPayload(artistKp.privateKey, genesisPayload)
    const platformSig = await signPayload(platformPrivKey, genesisPayload)

    const transferPayload = {
      artworkId: 'aw_test',
      sequence: 2,
      eventType: 'TRANSFER',
      fromOwner: 'artist_1',
      toOwner: 'collector_1',
      occurredAt: '2026-06-06T13:00:00Z',
      prevRecordHash: genesis.recordHash,
    }
    const transfer = await signPayload(artistKp.privateKey, transferPayload)

    // ── Build export ──
    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: {
        keyCode: 'KC_TEST',
        integrityHash,
        timestampToken: null,
        platformSignature: platformSig.signature,
      },
      artist: { id: 'artist_1', displayName: 'Test Artist', publicKey: artistPubHex },
      platform: { publicKey: platformPubHex },
      provenance: [
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: genesis.recordHash,
          signature: genesis.signature,
          signerPublicKey: artistPubHex,
          signerRole: 'ARTIST',
        },
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: platformSig.recordHash,
          signature: platformSig.signature,
          signerPublicKey: platformPubHex,
          signerRole: 'PLATFORM',
        },
        {
          payload: transferPayload as Record<string, unknown>,
          recordHash: transfer.recordHash,
          signature: transfer.signature,
          signerPublicKey: artistPubHex,
          signerRole: 'ARTIST',
        },
      ],
    }

    const result = await verifySignedExport(exportData, { platformPubKey: platformPubHex })
    expect(result.verified).toBe(true)
    expect(result.chainLength).toBe(3)
    expect(result.checks.every((c) => c.pass)).toBe(true)
  })

  test('detects hash tampering', async () => {
    const kp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const pubHex = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex')

    const payload = {
      artworkId: 'aw_tamper',
      sequence: 1,
      eventType: 'GENESIS',
      fromOwner: null,
      toOwner: 'artist_1',
      occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: '0'.repeat(64),
    }
    const sorted = Object.keys(payload).sort().reduce<Record<string, unknown>>(
      (acc, k) => { acc[k] = (payload as Record<string, unknown>)[k]; return acc }, {},
    )
    const json = JSON.stringify(sorted)
    const realHash = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)),
    ).toString('hex')
    const sig = Buffer.from(
      await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, Buffer.from(realHash, 'hex')),
    ).toString('hex')

    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: { keyCode: 'KC_TAMPER', integrityHash: realHash, timestampToken: null, platformSignature: null },
      artist: { id: 'artist_1', displayName: 'Test', publicKey: pubHex },
      platform: { publicKey: null },
      provenance: [
        {
          payload: { ...payload, toOwner: 'ATTACKER' } as Record<string, unknown>,
          recordHash: realHash,
          signature: sig,
          signerPublicKey: pubHex,
          signerRole: 'ARTIST',
        },
      ],
    }

    const result = await verifySignedExport(exportData)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'INTEGRITY' && !c.pass)).toBe(true)
  })

  test('detects broken chain', async () => {
    const kp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const pubHex = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex')

    async function makeRecord(payload: Record<string, unknown>) {
      const sorted = Object.keys(payload).sort().reduce<Record<string, unknown>>(
        (acc, k) => { acc[k] = (payload as Record<string, unknown>)[k]; return acc }, {},
      )
      const json = JSON.stringify(sorted)
      const hash = Buffer.from(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)),
      ).toString('hex')
      const sig = Buffer.from(
        await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, Buffer.from(hash, 'hex')),
      ).toString('hex')
      return { recordHash: hash, signature: sig }
    }

    const r1 = await makeRecord({
      artworkId: 'aw_chain', sequence: 1, eventType: 'GENESIS',
      fromOwner: null, toOwner: 'artist_1', occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: '0'.repeat(64),
    })
    const r2 = await makeRecord({
      artworkId: 'aw_chain', sequence: 2, eventType: 'TRANSFER',
      fromOwner: 'artist_1', toOwner: 'collector_1', occurredAt: '2026-06-06T13:00:00Z',
      prevRecordHash: 'f'.repeat(64), // BROKEN CHAIN
    })

    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: { keyCode: 'KC_CHAIN', integrityHash: r1.recordHash, timestampToken: null, platformSignature: null },
      artist: { id: 'artist_1', displayName: 'Test', publicKey: pubHex },
      platform: { publicKey: null },
      provenance: [
        { payload: {} as Record<string, unknown>, recordHash: r1.recordHash, signature: r1.signature, signerPublicKey: pubHex, signerRole: 'ARTIST' },
        { payload: {} as Record<string, unknown>, recordHash: r2.recordHash, signature: r2.signature, signerPublicKey: pubHex, signerRole: 'ARTIST' },
      ],
    }
    exportData.provenance[0].payload = {
      artworkId: 'aw_chain', sequence: 1, eventType: 'GENESIS',
      fromOwner: null, toOwner: 'artist_1', occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: '0'.repeat(64),
    } as Record<string, unknown>
    exportData.provenance[1].payload = {
      artworkId: 'aw_chain', sequence: 2, eventType: 'TRANSFER',
      fromOwner: 'artist_1', toOwner: 'collector_1', occurredAt: '2026-06-06T13:00:00Z',
      prevRecordHash: 'f'.repeat(64),
    } as Record<string, unknown>

    const result = await verifySignedExport(exportData)
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'CHAIN' && !c.pass)).toBe(true)
  })

  test('rejects a record with a signature but no signerPublicKey', async () => {
    const artistKp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const artistPubHex = Buffer.from(await crypto.subtle.exportKey('raw', artistKp.publicKey)).toString('hex')
    const { privateKey: platformPrivKey, publicKeyHex: platformPubHex } = await generatePlatformKey()

    const integrityHash = 'b'.repeat(64)
    const genesisPayload = {
      artworkId: 'aw_nullpub', sequence: 1, eventType: 'GENESIS',
      fromOwner: null, toOwner: 'artist_1', occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: integrityHash,
    }
    const genesis = await signPayload(artistKp.privateKey, genesisPayload)
    const platformSig = await signPayload(platformPrivKey, genesisPayload)

    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: { keyCode: 'KC_NULLPUB', integrityHash, timestampToken: null, platformSignature: platformSig.signature },
      artist: { id: 'artist_1', displayName: 'Test', publicKey: artistPubHex },
      platform: { publicKey: platformPubHex },
      provenance: [
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: genesis.recordHash,
          signature: genesis.signature,
          signerPublicKey: null, // signature present, no key to verify against
          signerRole: 'ARTIST',
        },
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: platformSig.recordHash,
          signature: platformSig.signature,
          signerPublicKey: platformPubHex,
          signerRole: 'PLATFORM',
        },
      ],
    }

    const result = await verifySignedExport(exportData, { platformPubKey: platformPubHex })
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'SIGNATURE' && !c.pass && c.detail.includes('signerPublicKey'))).toBe(true)
  })

  test('rejects a genesis record not anchored to integrityHash', async () => {
    const artistKp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const artistPubHex = Buffer.from(await crypto.subtle.exportKey('raw', artistKp.publicKey)).toString('hex')
    const { privateKey: platformPrivKey, publicKeyHex: platformPubHex } = await generatePlatformKey()

    const integrityHash = 'c'.repeat(64)
    const genesisPayload = {
      artworkId: 'aw_anchor', sequence: 1, eventType: 'GENESIS',
      fromOwner: null, toOwner: 'artist_1', occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: 'd'.repeat(64), // WRONG anchor
    }
    const genesis = await signPayload(artistKp.privateKey, genesisPayload)
    const platformSig = await signPayload(platformPrivKey, genesisPayload)

    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      artKey: { keyCode: 'KC_ANCHOR', integrityHash, timestampToken: null, platformSignature: platformSig.signature },
      artist: { id: 'artist_1', displayName: 'Test', publicKey: artistPubHex },
      platform: { publicKey: platformPubHex },
      provenance: [
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: genesis.recordHash,
          signature: genesis.signature,
          signerPublicKey: artistPubHex,
          signerRole: 'ARTIST',
        },
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: platformSig.recordHash,
          signature: platformSig.signature,
          signerPublicKey: platformPubHex,
          signerRole: 'PLATFORM',
        },
      ],
    }

    const result = await verifySignedExport(exportData, { platformPubKey: platformPubHex })
    expect(result.verified).toBe(false)
    expect(result.checks.some((c) => c.category === 'CHAIN' && !c.pass && c.detail.includes('integrityHash'))).toBe(true)
  })

  test('rejects a tampered artKey.platformSignature', async () => {
    const artistKp = (await crypto.subtle.generateKey(
      { name: 'Ed25519' }, true, ['sign', 'verify'],
    )) as CryptoKeyPair
    const artistPubHex = Buffer.from(await crypto.subtle.exportKey('raw', artistKp.publicKey)).toString('hex')
    const { privateKey: platformPrivKey, publicKeyHex: platformPubHex } = await generatePlatformKey()

    const integrityHash = 'e'.repeat(64)
    const genesisPayload = {
      artworkId: 'aw_platsig', sequence: 1, eventType: 'GENESIS',
      fromOwner: null, toOwner: 'artist_1', occurredAt: '2026-06-06T12:00:00Z',
      prevRecordHash: integrityHash,
    }
    const genesis = await signPayload(artistKp.privateKey, genesisPayload)
    const platformSig = await signPayload(platformPrivKey, genesisPayload)

    const exportData: SignedExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      // Declared platformSignature is tampered — doesn't match the real co-signature
      artKey: { keyCode: 'KC_PLATSIG', integrityHash, timestampToken: null, platformSignature: 'f'.repeat(128) },
      artist: { id: 'artist_1', displayName: 'Test', publicKey: artistPubHex },
      platform: { publicKey: platformPubHex },
      provenance: [
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: genesis.recordHash,
          signature: genesis.signature,
          signerPublicKey: artistPubHex,
          signerRole: 'ARTIST',
        },
        {
          payload: genesisPayload as Record<string, unknown>,
          recordHash: platformSig.recordHash,
          signature: platformSig.signature,
          signerPublicKey: platformPubHex,
          signerRole: 'PLATFORM',
        },
      ],
    }

    const result = await verifySignedExport(exportData, { platformPubKey: platformPubHex })
    expect(result.verified).toBe(false)
  })
})
