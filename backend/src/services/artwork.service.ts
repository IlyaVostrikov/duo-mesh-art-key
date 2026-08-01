import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import type { ArtworkStatus, ArtworkCategory, MediaType, EditionType } from '../generated/prisma/enums'
import { toArtworkDto, toArtworkPublicDto, toArtworkPublicDtoFull, type ArtworkDto, type ArtworkPublicDto, type ArtworkPublicFullDto } from '../dto/artwork.dto'
import { ArtKeyService } from './art-key.service'
import type { SigningService } from './signing.service'

export class ArtworkService {
  private artKeyService: ArtKeyService

  constructor(
    private prisma: DbClient,
    private signingService?: SigningService,
  ) {
    this.artKeyService = new ArtKeyService(prisma, signingService)
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
  }): Promise<{ artworks: ArtworkPublicDto[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, category, mediaType, status, style, priceMin, priceMax, editionType, sort = 'newest', q, artistId } = params
    const where: Prisma.ArtworkWhereInput = { status: status ? (status as ArtworkStatus) : (artistId ? undefined : { not: 'DRAFT' }) }

    if (artistId) where.artistId = artistId
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category as ArtworkCategory
    if (mediaType) where.mediaType = mediaType as MediaType
    if (style) where.styleTags = { has: style }
    if (editionType) where.editionType = editionType as EditionType
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

  async getById(artworkId: string): Promise<ArtworkPublicFullDto | null> {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true, fromOwner: true }, orderBy: { sequence: 'asc' } } },
    })
    if (!artwork) return null

    // Increment view count
    await this.prisma.artwork.update({ where: { id: artworkId }, data: { viewCount: { increment: 1 } } })

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
    // Refuse to delete artwork that has an ArtKey — provenance is immutable.
    // Only DRAFT artworks (no ArtKey issued) can be hard-deleted.
    const artKey = await this.prisma.artKey.findUnique({ where: { artworkId } })
    if (artKey) {
      throw new Error('Cannot delete artwork with an issued ArtKey. Archive it instead.')
    }
    await this.prisma.artwork.delete({ where: { id: artworkId } })
  }

  async search(query: string, page = 1, pageSize = 20) {
    const where: Prisma.ArtworkWhereInput = {
      status: { not: 'DRAFT' },
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
