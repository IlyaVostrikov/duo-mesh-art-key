import { Hono } from 'hono'
import { updateArtistSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { ArtistService } from '../services/artist.service'
import { HallService } from '../services/hall.service'

type ArtistRouteEnv = {
  Variables: {
    artistService: ArtistService
    hallService: HallService
  }
}

export function createArtistRoutes() {
  const routes = new Hono<ArtistRouteEnv>()

  routes.get('/', async (c) => {
    const svc = c.get('artistService')
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('pageSize') ?? '20')
    const search = c.req.query('search') ?? undefined
    const result = await svc.list({ page, pageSize, search })
    return c.json(result)
  })

  routes.get('/:id', optionalAuth(), async (c) => {
    const svc = c.get('artistService')
    const artistId = c.req.param('id')
    const authUser = getAuthUser(c)
    const artist = await svc.getById(artistId, authUser?.userId)
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist not found' }, 404)
    return c.json(artist)
  })

  routes.patch('/:id', authGuard(), async (c) => {
    const svc = c.get('artistService')
    const artistId = c.req.param('id')
    const authUser = getAuthUser(c)
    const artist = await svc.getById(artistId, authUser?.userId)
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist not found' }, 404)
    if (artist.userId !== authUser?.userId && authUser?.role !== 'ADMIN') {
      return c.json({ error: 'FORBIDDEN', message: 'Not your profile' }, 403)
    }
    const body = await c.req.json()
    const parsed = updateArtistSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }
    const data: Record<string, unknown> = {}
    if (parsed.data.artistStatement !== undefined) data.artistStatement = parsed.data.artistStatement
    if (parsed.data.websiteUrl !== undefined) data.websiteUrl = parsed.data.websiteUrl || null
    if (parsed.data.location !== undefined) data.location = parsed.data.location || null
    return c.json(await svc.update(artistId, data))
  })

  routes.get('/:id/artworks', async (c) => {
    const svc = c.get('artistService')
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('pageSize') ?? '20')
    return c.json(await svc.getArtworks(c.req.param('id'), page, pageSize))
  })

  routes.get('/:id/hall', async (c) => {
    const hallSvc = c.get('hallService')
    const hall = await hallSvc.getByArtistId(c.req.param('id'))
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)
    return c.json(hall)
  })

  return routes
}
