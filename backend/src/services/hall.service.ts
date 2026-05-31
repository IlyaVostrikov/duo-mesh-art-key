import type { DbClient } from '../db'
import { Prisma } from '../generated/prisma/client'
import { toHallDto, toHallPublicDto } from '../dto/hall.dto'
import { generateUniqueSlug } from '../lib/slug'

export class HallService {
  constructor(private prisma: DbClient) {}

  async getBySlug(slug: string) {
    const hall = await this.prisma.exhibitionHall.findUnique({
      where: { slug },
      include: {
        artist: { include: { user: true } },
      },
    })
    if (!hall) return null

    const artworks = await this.prisma.artwork.findMany({
      where: { artistId: hall.artistId, status: { in: ['LISTED', 'IN_EXHIBITION'] } },
      orderBy: { createdAt: 'desc' },
    })

    return toHallPublicDto({ ...hall, artworks } as any)
  }

  async getByArtistId(artistId: string) {
    return this.prisma.exhibitionHall.findUnique({
      where: { artistId },
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
    coverImageUrl?: string
    layoutConfig?: Record<string, unknown>
    theme?: string
    isPublished?: boolean
  }) {
    const hall = await this.prisma.exhibitionHall.update({
      where: { artistId },
      data: { ...data, layoutConfig: data.layoutConfig as Prisma.InputJsonValue },
      include: { artist: { include: { user: true } } },
    })
    const artworks = await this.prisma.artwork.findMany({
      where: { artistId, status: { in: ['LISTED', 'IN_EXHIBITION'] } },
      orderBy: { createdAt: 'desc' },
    })
    return toHallPublicDto({ ...hall, artworks } as any)
  }

  async incrementViewCount(slug: string) {
    await this.prisma.exhibitionHall.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    })
  }
}
