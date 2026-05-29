import type { DbClient } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { toArtworkDto, toArtworkPublicDtoFull } from '../dto/artwork.dto'
import { ArtKeyService } from './art-key.service'

export class ArtworkService {
  private artKeyService: ArtKeyService

  constructor(private prisma: DbClient) {
    this.artKeyService = new ArtKeyService(prisma)
  }

  async list(params: {
    page?: number
    pageSize?: number
    category?: string
    status?: string
    style?: string
    priceMin?: number
    priceMax?: number
    editionType?: string
    sort?: string
  }) {
    const { page = 1, pageSize = 20, category, status, style, priceMin, priceMax, editionType, sort = 'newest' } = params
    const where: Prisma.ArtworkWhereInput = { status: status ? (status as any) : { not: 'DRAFT' } }

    if (category) where.category = category as any
    if (style) where.styleTags = { has: style }
    if (editionType) where.editionType = editionType as any
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
        include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.artwork.count({ where }),
    ])

    return {
      artworks: artworks.map(toArtworkPublicDtoFull),
      total,
      page,
      pageSize,
    }
  }

  async getById(artworkId: string) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true, fromOwner: true }, orderBy: { createdAt: 'asc' } } },
    })
    if (!artwork) return null

    // Increment view count
    await this.prisma.artwork.update({ where: { id: artworkId }, data: { viewCount: { increment: 1 } } })

    return toArtworkPublicDtoFull(artwork as any)
  }

  async create(artistId: string, data: {
    title: string
    description?: string
    year?: number
    medium?: string
    dimensions?: string
    category?: string
    styleTags?: string[]
    isDigitalOriginal?: boolean
    isPhysicalDigitized?: boolean
    price?: number
    currency?: string
    editionType?: string
    editionTotal?: number
    allowOffers?: boolean
  }) {
    const artwork = await this.prisma.artwork.create({
      data: { ...data, artistId } as any,
    })

    // Generate ArtKey for the artwork
    await this.artKeyService.generate(artwork.id, artistId)

    return toArtworkDto(artwork)
  }

  async update(artworkId: string, data: any) {
    const artwork = await this.prisma.artwork.update({
      where: { id: artworkId },
      data,
      include: { artist: { include: { user: true, hall: true } }, artKeys: true, provenanceRecords: { include: { toOwner: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    return toArtworkPublicDtoFull(artwork as any)
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
