import { Hono } from 'hono'
import { updateHallSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { HallService } from '../services/hall.service'
import { ArtistService } from '../services/artist.service'

type HallRouteEnv = {
  Variables: {
    hallService: HallService
    artistService: ArtistService
  }
}

export function createHallRoutes() {
  const routes = new Hono<HallRouteEnv>()

  // Public: list all published halls
  routes.get('/', async (c) => {
    const svc = c.get('hallService')
    const halls = await svc.getAllPublished()
    return c.json(halls)
  })

  // Public: get published hall by slug
  routes.get('/:slug', async (c) => {
    const svc = c.get('hallService')
    const hall = await svc.getBySlug(c.req.param('slug'), { publishedOnly: true })
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)
    await svc.incrementViewCount(c.req.param('slug'))
    return c.json(hall)
  })

  // Artist: update hall
  routes.patch('/:slug', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('hallService')
    const authUser = getAuthUser(c)!
    const body = await c.req.json()
    const parsed = updateHallSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }
    const hall = await svc.getBySlug(c.req.param('slug'))
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)

    // Admins can edit any hall; artists can only edit their own
    if (authUser.role !== 'ADMIN') {
      const artistSvc = c.get('artistService')
      const artist = await artistSvc.getByUserId(authUser.userId)
      if (!artist || artist.id !== hall.artistId) {
        return c.json({ error: 'FORBIDDEN', message: 'You can only edit your own hall' }, 403)
      }
    }

    const updated = await svc.update(hall.artistId, parsed.data)
    return c.json(updated)
  })

  return routes
}
