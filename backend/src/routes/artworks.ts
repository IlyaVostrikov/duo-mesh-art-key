import { Hono } from 'hono'
import { z } from 'zod'
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

const addImagesSchema = z.object({ urls: z.array(z.string().url()).min(1) })

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  mediaType: z.string().optional(),
  status: z.string().optional(),
  style: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  editionType: z.string().optional(),
  sort: z.string().default('newest'),
  q: z.string().optional(),
})

function isOwnerOrAdmin(artwork: { artistId: string }, artistId: string, role: string): boolean {
  return artwork.artistId === artistId || role === 'ADMIN'
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

    const q = listQuerySchema.parse(c.req.query())
    const result = await svc.list({ ...q, artistId })
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

    const fileHashes: Record<string, string> | undefined = body.fileHashes ?? undefined
    const artwork = await svc.create(artist.id, authUser!.userId, { ...parsed.data, fileHashes })
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
    if (!isOwnerOrAdmin(existing, artist.id, authUser!.role)) {
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
    if (!isOwnerOrAdmin(existing, artist.id, authUser!.role)) {
      return c.json({ error: 'FORBIDDEN', message: 'Not your artwork' }, 403)
    }

    await svc.delete(c.req.param('id'))
    return c.body(null, 204)
  })

  // Artist: add images to artwork (presigned URL confirmation)
  routes.post('/:id/images', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const artistSvc = c.get('artistService')
    const authUser = getAuthUser(c)
    const body = addImagesSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: 'VALIDATION', message: body.error.issues }, 400)

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    const existing = await svc.getById(c.req.param('id'))
    if (!existing) return c.json({ error: 'NOT_FOUND', message: 'Artwork not found' }, 404)
    if (!isOwnerOrAdmin(existing, artist.id, authUser!.role)) {
      return c.json({ error: 'FORBIDDEN', message: 'Not your artwork' }, 403)
    }

    const artwork = await svc.updateImages(c.req.param('id'), body.data.urls)
    return c.json(artwork)
  })

  return routes
}
