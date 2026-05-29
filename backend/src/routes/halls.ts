import { Hono } from 'hono'
import { updateHallSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { HallService } from '../services/hall.service'

type HallRouteEnv = {
  Variables: {
    hallService: HallService
  }
}

export function createHallRoutes() {
  const routes = new Hono<HallRouteEnv>()

  // Public: get hall by slug
  routes.get('/:slug', async (c) => {
    const svc = c.get('hallService')
    const hall = await svc.getBySlug(c.req.param('slug'))
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)
    await svc.incrementViewCount(c.req.param('slug'))
    return c.json(hall)
  })

  // Artist: update hall
  routes.patch('/:slug', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('hallService')
    const body = await c.req.json()
    const parsed = updateHallSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }
    const hall = await svc.getBySlug(c.req.param('slug'))
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)
    const updated = await svc.update(hall.artistId, parsed.data)
    return c.json(updated)
  })

  return routes
}
