import { Hono } from 'hono'
import { createArtworkSchema, updateArtworkSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { ArtworkService } from '../services/artwork.service'
import { ArtistService } from '../services/artist.service'

type ArtworkRouteEnv = {
  Variables: {
    artworkService: ArtworkService
    artistService: ArtistService
  }
}

export function createArtworkRoutes() {
  const routes = new Hono<ArtworkRouteEnv>()

  // Public: list artworks with filters. Pass ?my=true to scope to current artist.
  routes.get('/', optionalAuth(), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)

    let artistId: string | undefined
    if (c.req.query('my') === 'true' && authUser) {
      const artistSvc = c.get('artistService')
      const artist = await artistSvc.getByUserId(authUser.userId)
      artistId = artist?.id
    }

    const result = await svc.list({
      page: Number(c.req.query('page') ?? '1'),
      pageSize: Number(c.req.query('pageSize') ?? '20'),
      category: c.req.query('category') ?? undefined,
      mediaType: c.req.query('mediaType') ?? undefined,
      status: c.req.query('status') ?? undefined,
      style: c.req.query('style') ?? undefined,
      priceMin: c.req.query('priceMin') ? Number(c.req.query('priceMin')) : undefined,
      priceMax: c.req.query('priceMax') ? Number(c.req.query('priceMax')) : undefined,
      editionType: c.req.query('editionType') ?? undefined,
      sort: c.req.query('sort') ?? 'newest',
      q: c.req.query('q') ?? undefined,
      artistId,
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
    const artistSvc = c.get('artistService')
    const authUser = getAuthUser(c)
    const body = await c.req.json()
    const parsed = createArtworkSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) {
      return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)
    }

    const artwork = await svc.create(artist.id, parsed.data)
    return c.json(artwork, 201)
  })

  // Artist: update artwork
  routes.patch('/:id', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const artistSvc = c.get('artistService')
    const authUser = getAuthUser(c)
    const body = await c.req.json()

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    const existing = await svc.getById(c.req.param('id'))
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found' }, 404)
    if ((existing as any).artistId !== artist.id && authUser!.role !== 'ADMIN') {
      return c.json({ error: 'FORBIDDEN', message: 'Not your artwork' }, 403)
    }

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
    const artistSvc = c.get('artistService')
    const authUser = getAuthUser(c)

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    const existing = await svc.getById(c.req.param('id'))
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found' }, 404)
    if ((existing as any).artistId !== artist.id && authUser!.role !== 'ADMIN') {
      return c.json({ error: 'FORBIDDEN', message: 'Not your artwork' }, 403)
    }

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
