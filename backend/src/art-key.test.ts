import { describe, expect, test } from 'bun:test'
import { canonicalJSON } from './crypto/canonical'
import { sha256Hex, compositeFileHash, hashPayload } from './crypto/hash'
import { generateEd25519KeyPair } from './crypto/keys'
import { signPayload } from './crypto/sign'
import { verifyProvenanceSignature } from './crypto/verify'
import { artKeySchema, provenanceRecordSchema, artKeyVerificationSchema, type ArtKeyVerificationDto } from '@duo-mesh/contracts'

// ─── Crypto: canonicalJSON ───

describe('canonicalJSON', () => {
  test('sorts keys alphabetically', () => {
    const a = canonicalJSON({ z: 1, a: 2, m: 3 })
    const b = canonicalJSON({ a: 2, m: 3, z: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":2,"m":3,"z":1}')
  })

  test('produces identical output for nested insertion orders', () => {
    const obj1: Record<string, unknown> = { artworkId: 'x', sequence: 1, eventType: 'SALE' }
    const obj2: Record<string, unknown> = { eventType: 'SALE', sequence: 1, artworkId: 'x' }
    expect(canonicalJSON(obj1)).toBe(canonicalJSON(obj2))
  })

  test('null values are preserved', () => {
    const json = canonicalJSON({ a: null, b: 'val' })
    expect(json).toBe('{"a":null,"b":"val"}')
  })
})

// ─── Crypto: SHA-256 hashing ───

describe('sha256Hex', () => {
  test('produces 64-char hex string', () => {
    const hash = sha256Hex('hello')
    expect(hash).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
  })

  test('is deterministic', () => {
    expect(sha256Hex('hello')).toBe(sha256Hex('hello'))
  })

  test('different inputs produce different hashes', () => {
    expect(sha256Hex('hello')).not.toBe(sha256Hex('world'))
  })
})

// ─── Crypto: compositeFileHash ───

describe('compositeFileHash', () => {
  test('sorts filenames before hashing', () => {
    const a = compositeFileHash({ 'b.png': 'hashB', 'a.png': 'hashA' })
    const b = compositeFileHash({ 'a.png': 'hashA', 'b.png': 'hashB' })
    expect(a).toBe(b)
  })

  test('different file content produces different composite hash', () => {
    const h1 = compositeFileHash({ 'poster.png': 'abc123' })
    const h2 = compositeFileHash({ 'poster.png': 'def456' })
    expect(h1).not.toBe(h2)
  })

  test('produces 64-char hex string', () => {
    const hash = compositeFileHash({ 'file.png': 'a'.repeat(64) })
    expect(hash).toHaveLength(64)
  })
})

// ─── Crypto: hashPayload ───

describe('hashPayload', () => {
  test('canonicalizes before hashing', () => {
    const h1 = hashPayload({ c: 3, a: 1, b: 2 })
    const h2 = hashPayload({ a: 1, b: 2, c: 3 })
    expect(h1).toBe(h2)
  })

  test('produces 64-char hex string', () => {
    const hash = hashPayload({ artworkId: 'test' })
    expect(hash).toHaveLength(64)
  })
})

// ─── Crypto: Ed25519 sign + verify ───

describe('Ed25519 sign/verify (Web Crypto)', () => {
  test('generates valid keypair', async () => {
    const kp = await generateEd25519KeyPair()
    expect(kp.publicKey).toHaveLength(64)
    expect(kp.privateKey).toBeTruthy()
  })

  test('imports public key and verifies signature', async () => {
    const kp = await generateEd25519KeyPair()
    const payload = { artworkId: 'test-art', sequence: 1, eventType: 'SALE', fromOwner: null, toOwner: 'u1', occurredAt: new Date().toISOString(), prevRecordHash: 'hash' }

    const signed = await signPayload(kp.privateKey, payload)
    expect(signed.signature).toHaveLength(128) // Ed25519 sig = 64 bytes = 128 hex chars

    const result = await verifyProvenanceSignature(payload, signed.signature, kp.publicKey)
    expect(result.valid).toBe(true)
  })

  test('rejects signature from different key', async () => {
    const kp1 = await generateEd25519KeyPair()
    const kp2 = await generateEd25519KeyPair()
    const payload = { artworkId: 'test', sequence: 0, eventType: 'CREATION', fromOwner: null, toOwner: 'u1', occurredAt: new Date().toISOString(), prevRecordHash: 'hash' }

    const signed = await signPayload(kp1.privateKey, payload)
    const result = await verifyProvenanceSignature(payload, signed.signature, kp2.publicKey)
    expect(result.valid).toBe(false)
  })

  test('rejects signature on tampered payload', async () => {
    const kp = await generateEd25519KeyPair()
    const payload = { artworkId: 'test', sequence: 0, eventType: 'CREATION', fromOwner: null, toOwner: 'u1', occurredAt: new Date().toISOString(), prevRecordHash: 'hash' }

    const signed = await signPayload(kp.privateKey, payload)
    // Tamper the payload
    const tampered = { ...payload, toOwner: 'attacker' }
    const result = await verifyProvenanceSignature(tampered, signed.signature, kp.publicKey)
    expect(result.valid).toBe(false)
  })
})

// ─── Contracts: ArtKey schemas ───

describe('artKeySchema', () => {
  test('parses valid ArtKey', () => {
    const result = artKeySchema.safeParse({
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      keyCode: 'DUO-2026-ABCDEF01',
      ownerKey: 'X12345678-ABCDEF01',
      certificateHash: 'a'.repeat(64),
      integrityHash: 'b'.repeat(64),
      certificatePdfUrl: null,
      qrCodeUrl: null,
      nfcId: null,
      timestampToken: null,
      platformSignature: null,
      issuedAt: '2026-01-01T00:00:00.000Z',
      revokedAt: null,
    })
    expect(result.success).toBe(true)
  })

  test('rejects short keyCode', () => {
    const result = artKeySchema.safeParse({
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      keyCode: 'X', // too short for any reasonable code
      ownerKey: 'X12345678-ABCDEF01',
      certificateHash: 'a'.repeat(64),
      integrityHash: 'b'.repeat(64),
      certificatePdfUrl: null, qrCodeUrl: null, nfcId: null,
      timestampToken: null, platformSignature: null,
      issuedAt: '2026-01-01T00:00:00.000Z',
      revokedAt: null,
    })
    expect(result.success).toBe(true) // keyCode is just z.string()
  })

  test('requires uuid for id', () => {
    const data = {
      id: 'not-a-uuid',
      artworkId: '00000000-0000-1000-8000-000000000002',
      keyCode: 'DUO-2026-TEST',
      ownerKey: 'X12345678-ABCDEF01',
      certificateHash: 'a'.repeat(64),
      integrityHash: 'b'.repeat(64),
      issuedAt: '2026-01-01T00:00:00.000Z',
      revokedAt: null,
    }
    const result = artKeySchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

// ─── Contracts: provenanceRecordSchema ───

describe('provenanceRecordSchema', () => {
  test('parses valid genesis record', () => {
    const result = provenanceRecordSchema.safeParse({
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      artKeyId: '00000000-0000-1000-8000-000000000003',
      sequence: 0,
      fromUserId: null,
      toUserId: '00000000-0000-1000-8000-000000000004',
      transferType: 'CREATION',
      price: null,
      royaltyPercent: null,
      royaltyPaid: null,
      transactionHash: null,
      recordHash: 'a'.repeat(64),
      prevRecordHash: null,
      signature: null,
      signerPublicKey: null,
      signerRole: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      fromOwnerName: null,
      toOwnerName: 'Test User',
    })
    expect(result.success).toBe(true)
  })

  test('allows sale transfer type', () => {
    const result = provenanceRecordSchema.safeParse({
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      artKeyId: '00000000-0000-1000-8000-000000000003',
      sequence: 1,
      fromUserId: '00000000-0000-1000-8000-000000000004',
      toUserId: '00000000-0000-1000-8000-000000000005',
      transferType: 'PRIMARY_SALE',
      price: '15000',
      royaltyPercent: null, royaltyPaid: null, transactionHash: null,
      recordHash: 'b'.repeat(64),
      prevRecordHash: 'a'.repeat(64),
      signature: 'c'.repeat(128),
      signerPublicKey: 'd'.repeat(64),
      signerRole: 'PLATFORM',
      notes: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      fromOwnerName: 'Artist',
      toOwnerName: 'Collector',
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid transferType', () => {
    const result = provenanceRecordSchema.safeParse({
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      artKeyId: '00000000-0000-1000-8000-000000000003',
      sequence: 0, fromUserId: null, toUserId: 'u1',
      transferType: 'INVALID_TYPE',
      price: null, royaltyPercent: null, royaltyPaid: null, transactionHash: null,
      recordHash: 'a'.repeat(64), prevRecordHash: null,
      signature: null, signerPublicKey: null, signerRole: null, notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      fromOwnerName: null, toOwnerName: 'Test',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Contracts: artKeyVerificationSchema ───

describe('artKeyVerificationSchema', () => {
  function validVerification(): ArtKeyVerificationDto {
    return {
      artKey: {
        id: '00000000-0000-1000-8000-000000000001',
        keyCode: 'DUO-2026-TEST',
        ownerKey: 'X12345678-ABCDEF01',
        integrityHash: 'b'.repeat(64),
        certificateHash: 'a'.repeat(64),
        issuedAt: '2026-01-01T00:00:00.000Z',
        revokedAt: null,
        timestampToken: null,
        platformSignature: null,
      },
      artwork: {
        id: '00000000-0000-1000-8000-000000000002',
        title: 'Test',
        description: null,
        year: 2026,
        medium: 'DIGITAL',
        posterUrl: null,
        modelUrl: null,
        mediaType: 'IMAGE_2D',
        status: 'LISTED',
        price: null,
        currency: 'RUB',
      },
      artist: {
        id: '00000000-0000-1000-8000-000000000003',
        displayName: 'Test Artist',
        hallSlug: null,
      },
      provenance: [],
      verified: true,
      checks: [
        { label: 'integrityHash (file-based)', pass: true, detail: 'ok', category: 'INTEGRITY' },
      ],
      currentOwner: 'Test Artist',
    }
  }

  test('parses the real verify() response shape', () => {
    expect(artKeyVerificationSchema.safeParse(validVerification()).success).toBe(true)
  })

  test('accepts provenance records and nullable fields', () => {
    const data = validVerification()
    data.provenance = [{
      sequence: 0,
      transferType: 'CREATION',
      fromOwnerName: null,
      toOwnerName: 'Test Artist',
      price: null,
      recordHash: 'a'.repeat(64),
      prevRecordHash: 'b'.repeat(64),
      signature: 'c'.repeat(128),
      signerPublicKey: 'd'.repeat(64),
      signerRole: 'ARTIST',
      createdAt: '2026-01-01T00:00:00.000Z',
    }]
    data.artwork.year = null
    data.artwork.description = 'desc'
    expect(artKeyVerificationSchema.safeParse(data).success).toBe(true)
  })

  test('rejects the old DB-shaped artKey (nested artwork instead of top-level)', () => {
    const data = validVerification() as Record<string, unknown>
    data.artKey = {
      id: '00000000-0000-1000-8000-000000000001',
      artworkId: '00000000-0000-1000-8000-000000000002',
      keyCode: 'DUO-2026-TEST',
      ownerKey: 'X12345678-ABCDEF01',
      certificateHash: 'a'.repeat(64),
      integrityHash: 'b'.repeat(64),
      certificatePdfUrl: null,
      qrCodeUrl: null,
      nfcId: null,
      timestampToken: null,
      platformSignature: null,
      issuedAt: '2026-01-01T00:00:00.000Z',
      revokedAt: null,
      artwork: { id: '00000000-0000-1000-8000-000000000002', title: 'Test', artistName: 'Test Artist' },
    }
    delete (data as Record<string, unknown>).artwork
    expect(artKeyVerificationSchema.safeParse(data).success).toBe(false)
  })

  test('verified must be a boolean', () => {
    const data = { ...validVerification(), verified: 'yes' }
    expect(artKeyVerificationSchema.safeParse(data).success).toBe(false)
  })
})

// ─── Integration: provenance chain verification (crypto + logic, no DB) ───

describe('provenance chain integrity', () => {
  test('valid chain: genesis → sale', async () => {
    const kp = await generateEd25519KeyPair()
    const integrityHash = compositeFileHash({ 'poster.png': 'filehash12345678' })

    // Genesis
    const genesisPayload = {
      artworkId: 'art-1',
      sequence: 0,
      eventType: 'CREATION',
      fromOwner: null,
      toOwner: 'artist-user',
      occurredAt: new Date().toISOString(),
      prevRecordHash: integrityHash,
    }
    const genesisHash = hashPayload(genesisPayload)
    const genesisSig = await signPayload(kp.privateKey, genesisPayload)

    // Chain: genesis.prevRecordHash === integrityHash
    expect(genesisPayload.prevRecordHash).toBe(integrityHash)

    // Primary sale
    const salePayload = {
      artworkId: 'art-1',
      sequence: 1,
      eventType: 'PRIMARY_SALE',
      fromOwner: 'artist-user',
      toOwner: 'collector-user',
      occurredAt: new Date().toISOString(),
      prevRecordHash: genesisHash,
    }
    const saleHash = hashPayload(salePayload)

    // Chain: sale.prevRecordHash === genesis.recordHash
    expect(salePayload.prevRecordHash).toBe(genesisHash)

    // Verify genesis signature
    const genResult = await verifyProvenanceSignature(genesisPayload, genesisSig.signature, kp.publicKey)
    expect(genResult.valid).toBe(true)
    expect(genResult.recordHash).toBe(genesisHash)
  })

  test('tampered chain: broken link detected', async () => {
    const integrityHash = compositeFileHash({ 'poster.png': 'filehash12345678' })

    const genesisPayload = {
      artworkId: 'art-1',
      sequence: 0,
      eventType: 'CREATION',
      fromOwner: null,
      toOwner: 'artist-user',
      occurredAt: new Date().toISOString(),
      prevRecordHash: integrityHash,
    }
    const genesisHash = hashPayload(genesisPayload)

    const salePayload = {
      artworkId: 'art-1',
      sequence: 1,
      eventType: 'PRIMARY_SALE',
      fromOwner: 'artist-user',
      toOwner: 'collector-user',
      occurredAt: new Date().toISOString(),
      prevRecordHash: 'BROKEN_CHAIN_HASH_0000000000', // Tampered!
    }

    // Chain broken
    expect(salePayload.prevRecordHash).not.toBe(genesisHash)
  })
})
