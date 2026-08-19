import type { DbClient } from '../db'
import { isUniqueConstraintError, isUniqueConstraintOn } from '../db-errors'
import { NotFoundError } from '../http/errors'
import { toArtworkPublicDto, type ArtworkPublicDto } from '../dto/artwork.dto'
import { PUBLIC_VISIBLE_STATUSES } from './artwork.service'

// Shared with admin.service's seed path so the implicit "Saved" collection title
// can't drift — a mismatch would silently create a second collection and break
// the (collectorId, title) unique-key assumption.
export const SAVED_COLLECTION_TITLE = 'Saved'

export class CollectionService {
  constructor(private prisma: DbClient) {}

  /** Returns the collector id for a user, lazily creating the profile if missing. */
  private async getOrCreateCollectorId(userId: string): Promise<string> {
    try {
      // The create branch also seeds the "Saved" collection so a brand-new
      // collector never lacks one.
      const created = await this.prisma.collector.upsert({
        where: { userId },
        create: {
          userId,
          collections: { create: { title: SAVED_COLLECTION_TITLE, isPublic: false } },
        },
        update: {},
      })
      return created.id
    } catch (err) {
      // @prisma/adapter-pg's upsert is not atomic under concurrency — a racing
      // first-save can surface a P2002 on the userId unique key instead of the
      // no-op update branch. The unique violation only fires once the winner's
      // row is committed, so re-reading it here is guaranteed to see it.
      if (!isUniqueConstraintError(err)) throw err
      const existing = await this.prisma.collector.findUnique({ where: { userId } })
      if (existing) return existing.id
      throw err
    }
  }

  private async getOrCreateSavedCollection(collectorId: string) {
    try {
      return await this.prisma.collection.upsert({
        where: { collectorId_title: { collectorId, title: SAVED_COLLECTION_TITLE } },
        create: { collectorId, title: SAVED_COLLECTION_TITLE, isPublic: false },
        update: {},
      })
    } catch (err) {
      // Same non-atomic-upsert race as getOrCreateCollectorId, on the
      // (collectorId, title) unique key for a legacy collector without a
      // "Saved" collection yet. Re-read the committed winner.
      if (!isUniqueConstraintError(err)) throw err
      const existing = await this.prisma.collection.findFirst({
        where: { collectorId, title: SAVED_COLLECTION_TITLE },
      })
      if (existing) return existing
      throw err
    }
  }

  async saveArtwork(userId: string, artworkId: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      select: { id: true, status: true },
    })
    // Only publicly-visible artworks may be saved: a collector guessing a DRAFT
    // or SOLD artwork's UUID must not be able to pin it (and bump saveCount).
    if (!artwork || !(PUBLIC_VISIBLE_STATUSES as readonly string[]).includes(artwork.status)) {
      throw new NotFoundError('Artwork not found')
    }

    const collectorId = await this.getOrCreateCollectorId(userId)
    const collection = await this.getOrCreateSavedCollection(collectorId)

    try {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.collectionArtwork.create({
          data: { collectionId: collection.id, artworkId },
        }),
        this.prisma.artwork.update({
          where: { id: artworkId },
          data: { saveCount: { increment: 1 } },
        }),
      ])
      return { saved: true, saveCount: updated.saveCount }
    } catch (err) {
      // Concurrent first-time save: the other request won the race and the
      // (collectionId, artworkId) unique constraint fired — treat as idempotent
      // success without re-incrementing. Any other unique violation is a real bug.
      if (isUniqueConstraintOn(err, 'CollectionArtwork', ['collectionId', 'artworkId'])) {
        return { saved: true, saveCount: await this.getSaveCount(artworkId) }
      }
      throw err
    }
  }

  async unsaveArtwork(userId: string, artworkId: string) {
    const collector = await this.prisma.collector.findUnique({ where: { userId } })
    const collection = collector
      ? await this.prisma.collection.findFirst({
          where: { collectorId: collector.id, title: SAVED_COLLECTION_TITLE },
          select: { id: true },
        })
      : null

    if (!collection) {
      return { saved: false, saveCount: await this.getSaveCount(artworkId) }
    }

    // Atomic: delete the link and, only if a row was actually removed, decrement
    // save_count guarded by `gt: 0` so the counter never goes negative.
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.collectionArtwork.deleteMany({
        where: { collectionId: collection.id, artworkId },
      })
      if (res.count > 0) {
        await tx.artwork.updateMany({
          where: { id: artworkId, saveCount: { gt: 0 } },
          data: { saveCount: { decrement: 1 } },
        })
      }
    })

    return { saved: false, saveCount: await this.getSaveCount(artworkId) }
  }

  async getSaveStatus(userId: string, artworkId: string) {
    const collector = await this.prisma.collector.findUnique({ where: { userId } })
    const saveCount = await this.getSaveCount(artworkId)

    if (!collector) return { saved: false, saveCount }

    const collection = await this.prisma.collection.findFirst({
      where: { collectorId: collector.id, title: SAVED_COLLECTION_TITLE },
      select: { id: true },
    })
    if (!collection) return { saved: false, saveCount }

    // Mirror listSaved/listSavedIds: a saved-but-hidden artwork (e.g. flipped
    // back to DRAFT) must not reveal save state, so gate on visibility too.
    const item = await this.prisma.collectionArtwork.findFirst({
      where: {
        collectionId: collection.id,
        artworkId,
        artwork: { status: { in: [...PUBLIC_VISIBLE_STATUSES] } },
      },
    })
    return { saved: !!item, saveCount }
  }

  async listSaved(userId: string): Promise<{ artworks: ArtworkPublicDto[]; total: number }> {
    const collector = await this.prisma.collector.findUnique({ where: { userId } })
    if (!collector) return { artworks: [], total: 0 }

    const collection = await this.prisma.collection.findFirst({
      where: { collectorId: collector.id, title: SAVED_COLLECTION_TITLE },
      select: { id: true },
    })
    if (!collection) return { artworks: [], total: 0 }

    // Bookmarks survive unpublish but are hidden while the artwork is not
    // publicly visible: an artist who flips an artwork back to DRAFT must not
    // have its full content (title, price, provenance) leak through a saver's
    // list. The row is kept so it reappears if the artwork is re-listed.
    const items = await this.prisma.collectionArtwork.findMany({
      where: {
        collectionId: collection.id,
        artwork: { status: { in: [...PUBLIC_VISIBLE_STATUSES] } },
      },
      orderBy: { addedAt: 'desc' },
      include: {
        artwork: {
          include: {
            artist: { include: { user: true, hall: true } },
            artKeys: true,
            provenanceRecords: {
              include: { toOwner: true },
              orderBy: { sequence: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    return { artworks: items.map((item) => toArtworkPublicDto(item.artwork)), total: items.length }
  }

  async listSavedIds(userId: string): Promise<string[]> {
    const collector = await this.prisma.collector.findUnique({ where: { userId } })
    if (!collector) return []
    const collection = await this.prisma.collection.findFirst({
      where: { collectorId: collector.id, title: SAVED_COLLECTION_TITLE },
      select: { id: true },
    })
    if (!collection) return []
    const items = await this.prisma.collectionArtwork.findMany({
      where: {
        collectionId: collection.id,
        artwork: { status: { in: [...PUBLIC_VISIBLE_STATUSES] } },
      },
      select: { artworkId: true },
    })
    return items.map((i) => i.artworkId)
  }

  private async getSaveCount(artworkId: string): Promise<number> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      select: { saveCount: true },
    })
    return artwork?.saveCount ?? 0
  }
}
