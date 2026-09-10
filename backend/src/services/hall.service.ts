import type { DbClient } from '../db'
import { Prisma } from '../generated/prisma/client'
import { toHallDto, toHallPublicDto } from '../dto/hall.dto'
import { generateUniqueSlug } from '../lib/slug'
import { NotFoundError, ForbiddenError } from '../http/errors'

export class HallService {
  constructor(private prisma: DbClient) {}

  private async verifyOwnership(artistId: string, userId: string, role: string): Promise<void> {
    if (role === 'ADMIN') return
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { userId: true },
    })
    if (!artist) throw new NotFoundError('Artist not found')
    if (artist.userId !== userId) throw new ForbiddenError('Not your hall')
  }

  async getBySlug(
    slug: string,
    opts?: { publishedOnly?: boolean; viewerUserId?: string; viewerRole?: string },
  ) {
    const hall = await this.prisma.exhibitionHall.findUnique({
      where: { slug },
      include: {
        artist: { include: { user: true } },
      },
    })
    if (!hall) return null

    const isOwner = !!opts?.viewerUserId && hall.artist.userId === opts.viewerUserId
    const isAdmin = opts?.viewerRole === 'ADMIN'

    // Unpublished halls stay hidden from everyone except the owner and admins.
    if (opts?.publishedOnly && !hall.isPublished && !isOwner && !isAdmin) {
      return null
    }

    // Owners/admins see every work in their own hall; the public sees only
    // works that are actively listed or in exhibition.
    const isViewer = isOwner || isAdmin
    const artworks = await this.prisma.artwork.findMany({
      where: {
        artistId: hall.artistId,
        ...(isViewer ? {} : { status: { in: ['LISTED', 'IN_EXHIBITION'] } }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return toHallPublicDto({ ...hall, artworks })
  }

  async getByArtistId(artistId: string, opts?: { publishedOnly?: boolean }) {
    const where: { artistId: string; isPublished?: boolean } = { artistId }
    if (opts?.publishedOnly) where.isPublished = true

    return this.prisma.exhibitionHall.findUnique({
      where,
      include: { artist: { include: { user: true } } },
    })
  }

  async getOrCreate(artistId: string, artistName: string) {
    let hall = await this.prisma.exhibitionHall.findUnique({ where: { artistId } })
    if (!hall) {
      const baseSlug = artistName.toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-|-$/g, '') || `artist-${artistId.substring(0, 8)}`
      const slug = await generateUniqueSlug(this.prisma, baseSlug)

      hall = await this.prisma.exhibitionHall.create({
        data: {
          artistId,
          slug,
          title: `${artistName}'s Hall`,
          isPublished: false,
        },
      })
    }
    return toHallDto(hall)
  }

  async update(artistId: string, data: {
    title?: string
    description?: string
    coverImageUrl?: string | null
    layoutConfig?: Record<string, unknown>
    customization?: Record<string, unknown>
    theme?: string
    isPublished?: boolean
  }, userId: string, role: string) {
    await this.verifyOwnership(artistId, userId, role)
    const hall = await this.prisma.exhibitionHall.update({
      where: { artistId },
      data: {
        ...data,
        layoutConfig: data.layoutConfig as Prisma.InputJsonValue | undefined,
        customization: data.customization as Prisma.InputJsonValue | undefined,
      },
      include: { artist: { include: { user: true } } },
    })
    const artworks = await this.prisma.artwork.findMany({
      where: { artistId, status: { in: ['LISTED', 'IN_EXHIBITION'] } },
      orderBy: { createdAt: 'desc' },
    })
    return toHallPublicDto({ ...hall, artworks })
  }

  async getAllPublished() {
    const halls = await this.prisma.exhibitionHall.findMany({
      where: { isPublished: true },
      include: { artist: { include: { user: true } } },
      orderBy: { slug: 'asc' },
    })

    // Batch-load artworks for all halls in a single query
    const artistIds = [...new Set(halls.map((h) => h.artistId))]
    const allArtworks = await this.prisma.artwork.findMany({
      where: { artistId: { in: artistIds }, status: { in: ['LISTED', 'IN_EXHIBITION'] } },
      orderBy: { createdAt: 'desc' },
    })

    const artworksByArtist = new Map<string, typeof allArtworks>()
    for (const aw of allArtworks) {
      const list = artworksByArtist.get(aw.artistId)
      if (list) list.push(aw)
      else artworksByArtist.set(aw.artistId, [aw])
    }

    return halls.map((hall) =>
      toHallPublicDto({ ...hall, artworks: artworksByArtist.get(hall.artistId) ?? [] }),
    )
  }

  async incrementViewCount(slug: string) {
    await this.prisma.exhibitionHall.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    })
  }
}
