import type { DbClient } from '../db'

const DEFAULT_PAGE_SIZE = 20

export class SaleService {
  constructor(private prisma: DbClient) {}

  async getPurchasedArtworksByUser(userId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const collector = await this.prisma.collector.findUnique({
      where: { userId },
    })
    if (!collector) return { artworks: [], total: 0, page, pageSize }

    const where = { buyerId: collector.id }
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          artwork: {
            include: {
              artist: { include: { user: true, hall: true } },
              artKeys: { take: 1 },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sale.count({ where }),
    ])

    const artworks = sales.map((s) => ({
      id: s.artwork.id,
      title: s.artwork.title,
      posterUrl: s.artwork.posterUrl,
      mediaType: s.artwork.mediaType,
      category: s.artwork.category,
      status: s.artwork.status,
      price: s.artwork.price?.toString() ?? null,
      currency: s.artwork.currency,
      purchasePrice: s.price.toString(),
      purchasedAt: s.completedAt?.toISOString() ?? s.createdAt.toISOString(),
      artist: {
        id: s.artwork.artist.id,
        displayName: s.artwork.artist.user.displayName,
        hallSlug: s.artwork.artist.hall?.slug ?? null,
      },
      artKey: s.artwork.artKeys[0]
        ? { keyCode: s.artwork.artKeys[0].keyCode }
        : null,
    }))

    return { artworks, total, page, pageSize }
  }

  async getArtistSalesByUser(userId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const artist = await this.prisma.artist.findUnique({
      where: { userId },
    })
    if (!artist) return { sales: [], total: 0, page, pageSize }

    const where = { sellerId: artist.id }
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          artwork: true,
          buyer: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sale.count({ where }),
    ])

    return {
      sales: sales.map((s) => ({
        id: s.id,
        artworkTitle: s.artwork.title,
        price: s.price.toString(),
        currency: s.currency,
        buyerName: s.buyer.user.displayName ?? s.buyer.user.email,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }
}
