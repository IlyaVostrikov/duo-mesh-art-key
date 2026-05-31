import { Hono } from 'hono'
import { createInquirySchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import type { DbClient } from '../db'
import type { InquiryService } from '../services/inquiry.service'

type InquiryRouteEnv = {
  Variables: {
    prisma: DbClient
    inquiryService: InquiryService
  }
}

export function createInquiryRoutes() {
  const routes = new Hono<InquiryRouteEnv>()

  routes.post('/', async (c) => {
    const svc = c.get('inquiryService')
    const body = await c.req.json()
    const parsed = createInquirySchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    const inquiry = await svc.create(parsed.data)
    return c.json(inquiry, 201)
  })

  routes.get('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const prisma = c.get('prisma')
    const svc = c.get('inquiryService')
    const authUser = getAuthUser(c)

    const artist = await prisma.artist.findFirst({ where: { userId: authUser!.userId } })
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    return c.json(await svc.listForArtist(artist.id))
  })

  return routes
}
