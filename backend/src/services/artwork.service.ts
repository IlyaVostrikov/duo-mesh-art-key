import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { toArtworkDto, toArtworkPublicDto, toArtworkPublicDtoFull, type ArtworkDto, type ArtworkPublicDto, type ArtworkPublicFullDto } from '../dto/artwork.dto'
import { ArtKeyService } from './art-key.service'
import type { SigningService } from './signing.service'

/** Artwork statuses visible to unauthenticated users. */
const PUBLIC_VISIBLE_STATUSES = ['LISTED', 'IN_EXHIBITION'] as const

const VALID_STATUSES = ['DRAFT', 'LISTED', 'IN_EXHIBITION', 'SOLD', 'ARCHIVED'] as const
const VALID_CATEGORIES = ['DIGITAL', 'PHYSICAL', 'HYBRID'] as const
const VALID_MEDIA_TYPES = ['IMAGE', 'VIDEO', '3D_MODEL', 'AUDIO'] as const
const VALID_EDITION_TYPES = ['UNIQUE', 'LIMITED', 'OPEN'] as const
const VALID_SORT = ['newest', 'oldest', 'price_asc', 'price_desc', 'popular'] as const

function isVisibleToPublic(status: string): boolean {
  return (PUBLIC_VISIBLE_STATUSES as readonly string[]).includes(status)
}

export class ArtworkService {
  private artKeyService: ArtKeyService

  constructor(
    private prisma: DbClient,
    private signingService?: SigningService,
  ) {
    this.artKeyService = new ArtKeyService(prisma, signingService)
  }

  // ── Visibility predicate shared across all public queries ──

  private publicVisibilityFilter(): Prisma.ArtworkWhereInput {
    return { status: { in: [...PUBLIC_VISIBLE_STATUSES] } }
  }

  async list(params: {
    page?: number
    pageSize?: number
    category?: string
    mediaType?: string
    status?: string
    style?: string
    priceMin?: number
    priceMax?: number
    editionType?: string
    sort?: string
    q?: string
    artistId?: string
    viewerUserId?: string
    viewerRole?: string
  }): Promise<{ artworks: ArtworkPublicDto[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, category, mediaType, status, style, priceMin, priceMax, editionType, sort = 'newest', q, artistId, viewerUserId, viewerRole } = params

    // Validate enum values — invalid filters return 400 instead of Prisma error
    if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
      throw new InvalidFilterError('status', status, [...VALID_STATUSES])
    }
    if (category && !(VALID_CATEGORIES as readonly string[]).includes(category)) {
      throw new InvalidFilterError('category', category, [...VALID_CATEGORIES])
    }
    if (mediaType && !(VALID_MEDIA_TYPES as readonly string[]).includes(mediaType)) {
      throw new InvalidFilterError('mediaType', mediaType, [...VALID_MEDIA_TYPES])
    }
    if (editionType && !(VALID_EDITION_TYPES as readonly string[]).includes(editionType)) {
      throw new InvalidFilterError('editionType', editionType, [...VALID_EDITION_TYPES])
    }
    if (!(VALID_SORT as readonly string[]).includes(sort)) {
      throw new InvalidFilterError('sort', sort, [...VALID_SORT])
    }

    const where: Prisma.ArtworkWhereInput = {}

    // Determine once whether viewer can bypass the public-visibility filter
    let canBypassVisibility = false
    if (artistId && viewerUserId) {
      const ownerCheck = await this.prisma.artist.findUnique({
        where: { id: artistId },
        select: { userId: true },
      })
      canBypassVisibility = ownerCheck?.userId === viewerUserId || viewerRole === 'ADMIN'
    }

    if (status) {
      if (!isVisibleToPublic(status) && !canBypassVisibility) {
        throw new InvalidFilterError('status', status, [...PUBLIC_VISIBLE_STATUSES])
      }
      where.status = status as Prisma.ArtworkWhereInput['status']
    }

    if (!canBypassVisibility && !status) {
      Object.assign(where, this.publicVisibilityFilter())
    }

    if (artistId) where.artistId = artistId
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category as Prisma.ArtworkWhereInput['category']
    if (mediaType) where.mediaType = mediaType as Prisma.ArtworkWhereInput['mediaType']
    if (style) where.styleTags = { has: style }
    if (editionType) where.editionType = editionType as Prisma.ArtworkWhereInput['editionType']
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {}
      if (priceMin !== undefined) where.price.gte = priceMin
      if (priceMax !== undefined) where.price.lte = priceMax
    }

    const orderBy: Prisma.ArtworkOrderByWithRelationInput = {}
    switch (sort) {
      case 'oldest': orderBy.createdAt = 'asc'; break
      case 'price_asc': orderBy.price = 'asc'; break
      case 'price_desc': orderBy.price = 'desc'; break
      case 'popular': orderBy.viewCount = 'desc'; break
      default: orderBy.createdAt = 'desc'
    }

    const [artworks, total] = await Promise.all([
      this.prisma.artwork.findMany({
        where,
        include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true }, orderBy: { sequence: 'desc' }, take: 1 } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.artwork.count({ where }),
    ])

    return {
      artworks: artworks.map((a) => toArtworkPublicDto(a)),
      total,
      page,
      pageSize,
    }
  }

  /** Public access: returns artwork if publicly visible, increments view count. */
  async getById(artworkId: string, opts?: { userId?: string; role?: string }): Promise<ArtworkPublicFullDto | null> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true, fromOwner: true }, orderBy: { sequence: 'asc' } } },
    })
    if (!artwork) return null

    // Visibility gate: only publicly visible artworks (or owner/admin override)
    const isOwner = opts?.userId && artwork.artist.userId === opts.userId
    const isAdmin = opts?.role === 'ADMIN'
    if (!isOwner && !isAdmin && !isVisibleToPublic(artwork.status)) return null

    // Increment view count (only for public access, not owner/admin self-view)
    if (!isOwner && !isAdmin) {
      await this.prisma.artwork.update({ where: { id: artworkId }, data: { viewCount: { increment: 1 } } })
    }

    return toArtworkPublicDtoFull(artwork)
  }

  /** Internal lookup: returns full artwork without visibility check or view increment. */
  async lookupById(artworkId: string): Promise<ArtworkPublicFullDto | null> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true, fromOwner: true }, orderBy: { sequence: 'asc' } } },
    })
    if (!artwork) return null
    return toArtworkPublicDtoFull(artwork)
  }

  async create(artistId: string, userId: string, data: {
    title: string
    description?: string
    year?: number
    medium?: string
    dimensions?: string
    category?: string
    styleTags?: string[]
    mediaType?: string
    posterUrl: string
    modelUrl?: string
    software?: string
    isScanned?: boolean
    polyCount?: number
    isDigitalOriginal?: boolean
    isPhysicalDigitized?: boolean
    price?: number
    currency?: string
    editionType?: string
    editionTotal?: number
    allowOffers?: boolean
    fileHashes?: Record<string, string>
  }) {
    const { fileHashes, ...rest } = data
    const artwork = await this.prisma.artwork.create({
      data: {
        ...rest,
        artistId,
        contentHashes: fileHashes ?? {},
      } as Prisma.ArtworkUncheckedCreateInput,
    })

    // Generate ArtKey for the artwork with file hashes and signing keys
    await this.artKeyService.generate({
      artworkId: artwork.id,
      artistId,
      userId,
      fileHashes: data.fileHashes ?? {},
    })

    return toArtworkDto(artwork)
  }

  async update(artworkId: string, data: Prisma.ArtworkUncheckedUpdateInput): Promise<ArtworkPublicFullDto> {
    const artwork = await this.prisma.artwork.update({
      where: { id: artworkId },
      data,
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true, fromOwner: true }, orderBy: { sequence: 'desc' }, take: 1 } },
    })
    return toArtworkPublicDtoFull(artwork)
  }

  async updateImages(artworkId: string, imageUrls: string[]) {
    const artwork = await this.prisma.artwork.update({
      where: { id: artworkId },
      data: { images: { push: imageUrls } },
    })
    return toArtworkDto(artwork)
  }

  async delete(artworkId: string) {
    await this.prisma.artwork.delete({ where: { id: artworkId } })
  }

  async search(query: string, page = 1, pageSize = 20) {
    const where: Prisma.ArtworkWhereInput = {
      ...this.publicVisibilityFilter(),
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { styleTags: { has: query } },
      ],
    }

    const [artworks, total] = await Promise.all([
      this.prisma.artwork.findMany({
        where,
        include: { artist: { include: { user: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artwork.count({ where }),
    ])

    // Also search artists
    const artists = await this.prisma.artist.findMany({
      where: {
        user: {
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      include: { user: true, hall: true },
      take: 10,
    })

    return {
      artworks: artworks.map((aw) => ({
        id: aw.id,
        title: aw.title,
        artistName: aw.artist.user.displayName,
        images: aw.images,
        category: aw.category,
        price: aw.price?.toString() ?? null,
        currency: aw.currency,
        status: aw.status,
      })),
      artists: artists.map((a) => ({
        id: a.id,
        displayName: a.user.displayName,
        avatarUrl: a.user.avatarUrl,
        hallSlug: a.hall?.slug ?? null,
      })),
      total,
      page,
    }
  }
}

export class InvalidFilterError extends Error {
  readonly status = 400
  readonly code = 'INVALID_FILTER'
  constructor(field: string, value: string, allowed: readonly string[]) {
    super(`Invalid filter "${field}": "${value}". Allowed: ${allowed.join(', ')}`)
    this.name = 'InvalidFilterError'
  }
}
