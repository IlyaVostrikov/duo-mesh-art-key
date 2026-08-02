import { Hono } from 'hono'
import { z } from 'zod'
import { createArtworkSchema, updateArtworkSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { errorResponse } from '../http/errors'
import { ArtworkService, InvalidFilterError } from '../services/artwork.service'
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
    try {
      const result = await svc.list({
        ...q,
        artistId,
        viewerUserId: authUser?.userId,
        viewerRole: authUser?.role,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof InvalidFilterError) {
        return c.json(errorResponse(err.code, err.message), 400)
      }
      throw err
    }
  })

  // Public: get artwork detail (visibility-gated)
  routes.get('/:id', optionalAuth(), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)
    const artwork = await svc.getById(c.req.param('id'), authUser ? { userId: authUser.userId, role: authUser.role } : undefined)
    if (!artwork) return c.json(errorResponse('NOT_FOUND', 'Artwork not found'), 404)
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
      return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)
    }

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) {
      return c.json(errorResponse('NOT_FOUND', 'Artist profile not found'), 404)
    }

    const fileHashes: Record<string, string> | undefined = body.fileHashes ?? undefined
    const artwork = await svc.create(artist.id, authUser!.userId, { ...parsed.data, fileHashes })
    return c.json(artwork, 201)
  })

  // Artist: update artwork
  routes.patch('/:id', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)
    const body = await c.req.json()

    const parsed = updateArtworkSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)
    }
    const artwork = await svc.update(c.req.param('id'), parsed.data, authUser!.userId, authUser!.role)
    return c.json(artwork)
  })

  // Artist: delete artwork
  routes.delete('/:id', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)
    await svc.delete(c.req.param('id'), authUser!.userId, authUser!.role)
    return c.body(null, 204)
  })

  // Artist: add images to artwork (presigned URL confirmation)
  routes.post('/:id/images', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('artworkService')
    const authUser = getAuthUser(c)
    const body = addImagesSchema.safeParse(await c.req.json())
    if (!body.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', body.error.issues), 400)

    const artwork = await svc.updateImages(c.req.param('id'), body.data.urls, authUser!.userId, authUser!.role)
    return c.json(artwork)
  })

  return routes
}
