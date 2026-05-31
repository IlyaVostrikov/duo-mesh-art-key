import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { toArtistDto, toArtistPublicDto } from '../dto/artist.dto'
import { generateUniqueSlug } from '../lib/slug'

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

  async create(userId: string, data: { artistStatement?: string; websiteUrl?: string; location?: string; hallTitle: string; hallDescription?: string }) {
    const artist = await this.prisma.artist.create({
      data: {
        userId,
        artistStatement: data.artistStatement ?? null,
        websiteUrl: data.websiteUrl || null,
        location: data.location || null,
        tier: 'FREE',
      },
    })

    // Generate hall slug from title
    const baseSlug = data.hallTitle.toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-|-$/g, '') || `hall-${artist.id.substring(0, 8)}`
    const slug = await generateUniqueSlug(this.prisma, baseSlug)

    await this.prisma.exhibitionHall.create({
      data: {
        artistId: artist.id,
        slug,
        title: data.hallTitle,
        description: data.hallDescription ?? null,
        isPublished: false,
      },
    })

    // Upgrade user role
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ARTIST' },
    })

    return this.prisma.artist.findUnique({
      where: { id: artist.id },
      include: { user: true, hall: true, _count: { select: { followers: true } } },
    })
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

  async getFollowing(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        artist: {
          include: {
            user: true,
            hall: true,
            _count: { select: { followers: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return follows.map((f) => ({
      ...toArtistPublicDto(f.artist as any),
      isFollowing: true,
      followedAt: f.createdAt.toISOString(),
    }))
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
