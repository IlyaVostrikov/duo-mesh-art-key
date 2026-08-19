import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createPrisma } from '../db'
import { KeyStore } from '../crypto/keystore'
import { SigningService } from './signing.service'

const databaseUrl = process.env.TEST_DATABASE_URL
const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('SigningService artist key lifecycle', () => {
  const prisma = createPrisma(databaseUrl!)
  let service: SigningService
  let storeDir: string
  let userId: string
  let artistId: string

  beforeAll(async () => {
    storeDir = await mkdtemp(join(tmpdir(), 'duo-keystore-test-'))
    // Fixed test-only salt (non-secret); 32 bytes = 64 hex chars.
    await writeFile(join(storeDir, 'keystore.salt'), 'ab'.repeat(32) + '\n')
    const keyStore = new KeyStore(join(storeDir, 'keystore.json'), 'test-secret-store-key')
    service = new SigningService(prisma, keyStore)
  })

  beforeEach(async () => {
    await prisma.signingKey.deleteMany()
    await prisma.artist.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({
      data: { email: 'artist@test.dev', passwordHash: 'test-hash', role: 'ARTIST' },
    })
    userId = user.id
    const artist = await prisma.artist.create({ data: { userId } })
    artistId = artist.id
  })

  afterAll(async () => {
    await prisma.signingKey.deleteMany()
    await prisma.artist.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
    await rm(storeDir, { recursive: true, force: true }).catch(() => {})
  })

  test('getOrCreateArtistKey is idempotent and leaves exactly one active key', async () => {
    const first = await service.getOrCreateArtistKey(artistId)
    const second = await service.getOrCreateArtistKey(artistId)

    expect(second.keyId).toBe(first.keyId)

    const active = await prisma.signingKey.findMany({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
    })
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe(first.keyId)
  })

  test('generateArtistKeyPair rotates: new key active, old key deactivated', async () => {
    const first = await service.getOrCreateArtistKey(artistId)
    const second = await service.generateArtistKeyPair(artistId)

    expect(second.keyId).not.toBe(first.keyId)

    const active = await prisma.signingKey.findMany({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
    })
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe(second.keyId)

    const old = await prisma.signingKey.findUnique({ where: { id: first.keyId } })
    expect(old!.isActive).toBe(false)
    expect(old!.revokedAt).not.toBeNull()
  })

  test('concurrent getOrCreateArtistKey never leaves the artist without an active key', async () => {
    const results = await Promise.all([
      service.getOrCreateArtistKey(artistId),
      service.getOrCreateArtistKey(artistId),
      service.getOrCreateArtistKey(artistId),
    ])

    for (const r of results) {
      expect(r.keyId).toBeTruthy()
      expect(r.publicKey).toBeTruthy()
    }

    // Serialized by the artist row lock: exactly one active key may exist, and
    // every caller must have received that same key (never a duplicate).
    const active = await prisma.signingKey.findMany({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
    })
    expect(active).toHaveLength(1)
    for (const r of results) {
      expect(r.keyId).toBe(active[0].id)
    }
  })

  test('getOrCreateArtistKey creates a fresh key when the only key is revoked', async () => {
    const first = await service.getOrCreateArtistKey(artistId)
    await prisma.signingKey.update({
      where: { id: first.keyId },
      data: { isActive: false, revokedAt: new Date() },
    })

    const second = await service.getOrCreateArtistKey(artistId)
    expect(second.keyId).not.toBe(first.keyId)

    const active = await prisma.signingKey.findMany({
      where: { ownerType: 'ARTIST', ownerId: artistId, isActive: true },
    })
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe(second.keyId)
  })
})
