import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { UserRole } from '../generated/prisma/enums'
import { toArtistDto, toArtistPublicDto } from '../dto/artist.dto'
import { generateUniqueSlug } from '../lib/slug'
import type { SigningService } from './signing.service'
import { NotFoundError, ForbiddenError } from '../http/errors'

export class ArtistService {
  constructor(
    private prisma: DbClient,
    private signingService?: SigningService,
  ) {}

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
      artists: artists.map((a) => toArtistPublicDto(a)),
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

    return toArtistPublicDto(artist, isFollowed)
  }

  async create(userId: string, data: { artistStatement?: string; websiteUrl?: string; location?: string; hallTitle: string; hallDescription?: string; avatarUrl?: string }) {
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

    // Upgrade GUEST/COLLECTOR → ARTIST. Never downgrade from ADMIN or existing ARTIST.
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const needsRoleUpgrade = currentUser && currentUser.role !== UserRole.ARTIST && currentUser.role !== UserRole.ADMIN

    if (needsRoleUpgrade || data.avatarUrl) {
      const userUpdate: Prisma.UserUpdateInput = {}
      if (needsRoleUpgrade) userUpdate.role = UserRole.ARTIST
      if (data.avatarUrl) userUpdate.avatarUrl = data.avatarUrl
      await this.prisma.user.update({ where: { id: userId }, data: userUpdate })
    }

    // Generate Ed25519 signing keypair for the artist (MVP: custodial)
    if (this.signingService) {
      await this.signingService.generateArtistKeyPair(artist.id)
    }

    return this.prisma.artist.findUnique({
      where: { id: artist.id },
      include: { user: true, hall: true, signingKeys: { where: { isActive: true }, take: 1 }, _count: { select: { followers: true } } },
    })
  }

  async getByUserId(userId: string) {
    return this.prisma.artist.findUnique({
      where: { userId },
      include: { user: true, hall: true, _count: { select: { followers: true } } },
    })
  }

  private async verifyOwnership(artistId: string, userId: string, role: string): Promise<void> {
    if (role === 'ADMIN') return
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { userId: true },
    })
    if (!artist) throw new NotFoundError('Artist not found')
    if (artist.userId !== userId) throw new ForbiddenError('Not your profile')
  }

  async update(artistId: string, data: { artistStatement?: string; websiteUrl?: string; location?: string; displayName?: string; bio?: string; avatarUrl?: string; socialLinks?: Record<string, string> }, userId: string, role: string) {
    await this.verifyOwnership(artistId, userId, role)
    const artist = await this.prisma.artist.update({
      where: { id: artistId },
      data: {
        ...(data.artistStatement !== undefined ? { artistStatement: data.artistStatement || null } : {}),
        ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl || null } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
      },
      include: { user: true, hall: true, _count: { select: { followers: true } } },
    })

    // Update user-level fields if provided
    const userUpdate: Record<string, unknown> = {}
    if (data.displayName !== undefined) userUpdate.displayName = data.displayName || null
    if (data.bio !== undefined) userUpdate.bio = data.bio || null
    if (data.avatarUrl !== undefined) userUpdate.avatarUrl = data.avatarUrl || null
    if (data.socialLinks !== undefined) userUpdate.socialLinks = data.socialLinks || null
    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({ where: { id: artist.userId }, data: userUpdate })
      // Re-fetch to include updated user fields
      const refreshed = await this.prisma.artist.findUnique({
        where: { id: artistId },
        include: { user: true, hall: true, _count: { select: { followers: true } } },
      })
      if (refreshed) return toArtistPublicDto(refreshed)
    }

    return toArtistPublicDto(artist)
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
      ...toArtistPublicDto(f.artist),
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
