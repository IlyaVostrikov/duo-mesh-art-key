import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { createPrisma } from '../db'
import { CollectionService } from './collection.service'

const databaseUrl = process.env.TEST_DATABASE_URL

const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('CollectionService save/unsave', () => {
  const prisma = createPrisma(databaseUrl!)
  const service = new CollectionService(prisma)

  let userId: string
  let artistId: string
  let artworkId: string

  async function cleanup() {
    await prisma.collectionArtwork.deleteMany()
    await prisma.collection.deleteMany()
    await prisma.collector.deleteMany()
    await prisma.artwork.deleteMany()
    await prisma.artist.deleteMany()
    await prisma.user.deleteMany()
  }

  beforeEach(async () => {
    await cleanup()

    const user = await prisma.user.create({
      data: {
        email: 'collector@test.dev',
        passwordHash: 'test-password-hash',
        role: 'COLLECTOR',
      },
    })
    userId = user.id

    const artist = await prisma.artist.create({ data: { userId } })
    artistId = artist.id

    const artwork = await prisma.artwork.create({
      data: {
        artistId,
        title: 'Test Artwork',
        posterUrl: '/assets/test.jpg',
        images: [],
        styleTags: [],
        status: 'LISTED',
      },
    })
    artworkId = artwork.id
  })

  afterAll(async () => {
    await cleanup()
    await prisma.$disconnect()
  })

  test('save creates collector + Saved collection atomically and increments saveCount', async () => {
    const result = await service.saveArtwork(userId, artworkId)
    expect(result.saved).toBe(true)
    expect(result.saveCount).toBe(1)

    // The collector upsert must also create exactly one "Saved" collection.
    const collector = await prisma.collector.findUnique({ where: { userId } })
    expect(collector).not.toBeNull()
    const savedCollections = await prisma.collection.findMany({
      where: { collectorId: collector!.id, title: 'Saved' },
    })
    expect(savedCollections).toHaveLength(1)
  })

  test('double-save is idempotent and does not double-increment saveCount', async () => {
    await service.saveArtwork(userId, artworkId)
    const second = await service.saveArtwork(userId, artworkId)
    expect(second.saved).toBe(true)
    expect(second.saveCount).toBe(1)
  })

  test('save for a pre-existing collector lacking a Saved collection creates it', async () => {
    // Simulate legacy data: a Collector profile created without its "Saved" collection.
    await prisma.collector.create({ data: { userId } })

    const result = await service.saveArtwork(userId, artworkId)
    expect(result.saved).toBe(true)
    expect(result.saveCount).toBe(1)

    const collector = await prisma.collector.findUnique({ where: { userId } })
    const savedCollections = await prisma.collection.findMany({
      where: { collectorId: collector!.id, title: 'Saved' },
    })
    expect(savedCollections).toHaveLength(1)
  })

  test('concurrent first-save of a brand-new collector creates one collector + one Saved collection', async () => {
    // No collector exists yet — every save races the collector upsert AND the
    // nested "Saved" collection create. Exactly one of each must win; the rest
    // take the idempotent path without re-incrementing saveCount.
    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.saveArtwork(userId, artworkId)),
    )

    for (const r of results) {
      expect(r.saved).toBe(true)
      expect(r.saveCount).toBe(1)
    }

    const collectors = await prisma.collector.findMany({ where: { userId } })
    expect(collectors).toHaveLength(1)
    const savedCollections = await prisma.collection.findMany({
      where: { collectorId: collectors[0].id, title: 'Saved' },
    })
    expect(savedCollections).toHaveLength(1)

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
    expect(artwork!.saveCount).toBe(1)
  })

  test('concurrent first-save of a legacy collector creates exactly one Saved collection', async () => {
    // Legacy collector with no "Saved" collection; two saves race to create it.
    await prisma.collector.create({ data: { userId } })

    const [a, b] = await Promise.all([
      service.saveArtwork(userId, artworkId),
      service.saveArtwork(userId, artworkId),
    ])

    expect(a.saved).toBe(true)
    expect(b.saved).toBe(true)

    const collector = await prisma.collector.findUnique({ where: { userId } })
    const savedCollections = await prisma.collection.findMany({
      where: { collectorId: collector!.id, title: 'Saved' },
    })
    expect(savedCollections).toHaveLength(1)

    // The duplicate save is idempotent: saveCount stays 1.
    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
    expect(artwork!.saveCount).toBe(1)
  })

  test('unsave decrements saveCount and clears saved state', async () => {
    await service.saveArtwork(userId, artworkId)
    const result = await service.unsaveArtwork(userId, artworkId)
    expect(result.saved).toBe(false)
    expect(result.saveCount).toBe(0)
  })

  test('double-unsave keeps saveCount floored at 0 (never negative)', async () => {
    await service.saveArtwork(userId, artworkId)
    await service.unsaveArtwork(userId, artworkId)
    const again = await service.unsaveArtwork(userId, artworkId)
    expect(again.saveCount).toBe(0)

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
    expect(artwork!.saveCount).toBe(0)
  })

  test('listSavedIds and getSaveStatus reflect save state', async () => {
    expect(await service.listSavedIds(userId)).toEqual([])

    await service.saveArtwork(userId, artworkId)
    expect(await service.listSavedIds(userId)).toEqual([artworkId])
    expect(await service.getSaveStatus(userId, artworkId)).toEqual({ saved: true, saveCount: 1 })

    await service.unsaveArtwork(userId, artworkId)
    expect(await service.listSavedIds(userId)).toEqual([])
  })

  test('listSaved returns the artwork DTO with artist summary', async () => {
    await service.saveArtwork(userId, artworkId)
    const { artworks, total } = await service.listSaved(userId)
    expect(total).toBe(1)
    expect(artworks).toHaveLength(1)
    expect(artworks[0].id).toBe(artworkId)
    expect(artworks[0].title).toBe('Test Artwork')
    expect(artworks[0].artist.id).toBe(artistId)
    expect(artworks[0].artist.displayName).toBeNull()
  })

  test('save of a missing artwork throws', async () => {
    await expect(
      service.saveArtwork(userId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('Artwork not found')
  })
})
