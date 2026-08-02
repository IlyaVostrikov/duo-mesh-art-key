import { Hono } from 'hono'
import { updateHallSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { errorResponse, ForbiddenError, NotFoundError } from '../http/errors'
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
    if (!hall) return c.json(errorResponse('NOT_FOUND', 'Hall not found'), 404)
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
      return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)
    }
    const hall = await svc.getBySlug(c.req.param('slug'))
    if (!hall) return c.json(errorResponse('NOT_FOUND', 'Hall not found'), 404)

    try {
      const updated = await svc.update(hall.artistId, parsed.data, authUser.userId, authUser.role)
      return c.json(updated)
    } catch (err) {
      if (err instanceof ForbiddenError) return c.json(errorResponse('FORBIDDEN', err.message), 403)
      if (err instanceof NotFoundError) return c.json(errorResponse('NOT_FOUND', err.message), 404)
      throw err
    }
  })

  return routes
}
