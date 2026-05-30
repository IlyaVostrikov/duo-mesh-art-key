import { Hono } from 'hono'
import { authGuard, getAuthUser } from '../guards/auth'
import type { DbClient } from '../db'

type SalesRouteEnv = {
  Variables: {
    prisma: DbClient
  }
}

export function createSalesRoutes() {
  const routes = new Hono<SalesRouteEnv>()

  // List current user's purchased artworks (collector's collection)
  routes.get('/me', authGuard(), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)

    const collector = await prisma.collector.findUnique({
      where: { userId: authUser!.userId },
    })
    if (!collector) return c.json({ artworks: [], total: 0 })

    const sales = await prisma.sale.findMany({
      where: { buyerId: collector.id },
      include: {
        artwork: {
          include: {
            artist: { include: { user: true, hall: true } },
            artKeys: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

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
      purchasedAt: s.createdAt.toISOString(),
      artist: {
        id: s.artwork.artist.id,
        displayName: s.artwork.artist.user.displayName,
        hallSlug: s.artwork.artist.hall?.slug ?? null,
      },
      artKey: s.artwork.artKeys[0]
        ? { keyCode: s.artwork.artKeys[0].keyCode }
        : null,
    }))

    return c.json({ artworks, total: artworks.length })
  })

  // List current user's sales (artist's sold works)
  routes.get('/artist', authGuard(), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)

    const artist = await prisma.artist.findUnique({
      where: { userId: authUser!.userId },
    })
    if (!artist) return c.json({ sales: [], total: 0 })

    const sales = await prisma.sale.findMany({
      where: { sellerId: artist.id },
      include: {
        artwork: true,
        buyer: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return c.json({
      sales: sales.map((s) => ({
        id: s.id,
        artworkTitle: s.artwork.title,
        price: s.price.toString(),
        currency: s.currency,
        buyerName: s.buyer.user.displayName ?? s.buyer.user.email,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      total: sales.length,
    })
  })

  return routes
}
