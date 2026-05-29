import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { toArtistDto, toArtistPublicDto } from '../dto/artist.dto'

export class ArtistService {
  constructor(private prisma: DbClient) {}

  async list(params: { page?: number; pageSize?: number; search?: string }) {
    const { page = 1, pageSize = 20, search } = params
    const where: Prisma.ArtistWhereInput = {}

    if (search) {
      where.user = {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        include: {
          user: true,
          hall: true,
          _count: { select: { followers: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artist.count({ where }),
    ])

    return {
      artists: artists.map((a) => toArtistPublicDto(a as any)),
      total,
      page,
      pageSize,
    }
  }

  async getById(artistId: string, currentUserId?: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        user: true,
        hall: true,
        _count: { select: { followers: true } },
      },
    })
    if (!artist) return null

    let isFollowed = false
    if (currentUserId) {
      const follow = await this.prisma.follow.findUnique({
        where: { followerId_artistId: { followerId: currentUserId, artistId } },
      })
      isFollowed = !!follow
    }

    return toArtistPublicDto(artist as any, isFollowed)
  }

  async getByUserId(userId: string) {
    return this.prisma.artist.findUnique({
      where: { userId },
      include: { user: true, hall: true, _count: { select: { followers: true } } },
    })
  }

  async update(artistId: string, data: { artistStatement?: string; websiteUrl?: string; location?: string }) {
    const artist = await this.prisma.artist.update({
      where: { id: artistId },
      data,
      include: { user: true, hall: true, _count: { select: { followers: true } } },
    })
    return toArtistPublicDto(artist as any)
  }

  async getArtworks(artistId: string, page = 1, pageSize = 20) {
    const where: Prisma.ArtworkWhereInput = { artistId, status: { not: 'DRAFT' } }
    const [artworks, total] = await Promise.all([
      this.prisma.artwork.findMany({
        where,
        include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artwork.count({ where }),
    ])
    return { artworks, total, page, pageSize }
  }
}
