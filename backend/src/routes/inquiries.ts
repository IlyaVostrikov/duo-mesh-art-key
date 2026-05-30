import { Hono } from 'hono'
import { createInquirySchema } from '@duo-mesh/contracts'
import type { DbClient } from '../db'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'

type InquiryRouteEnv = {
  Variables: {
    prisma: DbClient
  }
}

export function createInquiryRoutes() {
  const routes = new Hono<InquiryRouteEnv>()

  // Public: submit a "contact to buy" inquiry
  routes.post('/', async (c) => {
    const prisma = c.get('prisma')
    const body = await c.req.json()
    const parsed = createInquirySchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    // Check artwork exists
    const artwork = await prisma.artwork.findUnique({ where: { id: parsed.data.artworkId } })
    if (!artwork) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found' }, 404)

    const inquiry = await prisma.inquiry.create({ data: parsed.data })
    return c.json(inquiry, 201)
  })

  // Artist: list inquiries for their artworks
  routes.get('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)

    const artist = await prisma.artist.findFirst({ where: { userId: authUser!.userId } })
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    const inquiries = await prisma.inquiry.findMany({
      where: { artwork: { artistId: artist.id } },
      include: { artwork: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return c.json(inquiries)
  })

  return routes
}
