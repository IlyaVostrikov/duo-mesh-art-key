import { Hono } from 'hono'
import { createArtworkSchema, updateArtworkSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { ArtworkService } from '../services/artwork.service'

type ArtworkRouteEnv = {
  Variables: {
    artworkService: ArtworkService
  }
}

export function createArtworkRoutes() {
  const routes = new Hono<ArtworkRouteEnv>()

  // Public: list artworks with filters
  routes.get('/', async (c) => {
    const svc = c.get('artworkService')
    const result = await svc.list({
      page: Number(c.req.query('page') ?? '1'),
      pageSize: Number(c.req.query('pageSize') ?? '20'),
      category: c.req.query('category') ?? undefined,
      status: c.req.query('status') ?? undefined,
      style: c.req.query('style') ?? undefined,
      priceMin: c.req.query('priceMin') ? Number(c.req.query('priceMin')) : undefined,
      priceMax: c.req.query('priceMax') ? Number(c.req.query('priceMax')) : undefined,
      editionType: c.req.query('editionType') ?? undefined,
      sort: c.req.query('sort') ?? 'newest',
    })
    return c.json(result)
  })

  // Public: get artwork detail
  routes.get('/:id', optionalAuth(), async (c) => {
    const svc = c.get('artworkService')
    const artwork = await svc.getById(c.req.param('id'))
    if (!artwork) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found' }, 404)
    return c.json(artwork)
  })

  // Artist: create artwork
  routes.post('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)
    const body = await c.req.json()
    const parsed = createArtworkSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    // Get artist profile from the auth user
    // The authUser.userId is the User ID, we need the Artist ID
    return c.json({ error: 'NOT_IMPLEMENTED', message: 'Use artist context from dashboard' }, 501)
  })

  // Artist: update artwork
  routes.patch('/:id', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const body = await c.req.json()
    const parsed = updateArtworkSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }
    const artwork = await svc.update(c.req.param('id'), parsed.data)
    return c.json(artwork)
  })

  // Artist: delete artwork
  routes.delete('/:id', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    await svc.delete(c.req.param('id'))
    return c.body(null, 204)
  })

  // Artist: add images to artwork (presigned URL confirmation)
  routes.post('/:id/images', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const body = await c.req.json()
    const { urls } = body as { urls: string[] }
    if (!urls?.length) {
      return c.json({ error: 'VALIDATION', message: 'urls array is required' }, 400)
    }
    const artwork = await svc.updateImages(c.req.param('id'), urls)
    return c.json(artwork)
  })

  return routes
}
