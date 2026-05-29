import { Hono } from 'hono'
import { createInquirySchema } from '@duo-mesh/contracts'
import type { DbClient } from '../db'

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

  return routes
}
