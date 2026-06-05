import { Hono } from 'hono'
import { z } from 'zod'
import { createArtistSchema, updateArtistSchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, optionalAuth, getAuthUser } from '../guards/auth'
import { ArtistService } from '../services/artist.service'
import { HallService } from '../services/hall.service'
import { toHallDto } from '../dto/hall.dto'
import type { User, Artist, ExhibitionHall } from '../generated/prisma/client'

/** Strip sensitive fields from the raw Prisma object before sending to client. */
function sanitizeMe(raw: Artist & { user: User; hall: ExhibitionHall | null; _count: { followers: number } }) {
  const { passwordHash: _, ...safeUser } = raw.user
  return { ...raw, user: safeUser }
}

type ArtistRouteEnv = {
  Variables: {
    artistService: ArtistService
    hallService: HallService
  }
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

const artworksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export function createArtistRoutes() {
  const routes = new Hono<ArtistRouteEnv>()

  // Register as artist (onboarding)
  routes.post('/', authGuard(), async (c) => {
    const svc = c.get('artistService')
    const authUser = getAuthUser(c)

    // Check user doesn't already have an artist profile
    const existing = await svc.getByUserId(authUser!.userId)
    if (existing) {
      return c.json({ error: 'CONFLICT', message: 'Artist profile already exists' }, 409)
    }

    const body = await c.req.json()
    const parsed = createArtistSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    const artist = await svc.create(authUser!.userId, parsed.data)
    if (!artist) return c.json({ error: 'INTERNAL', message: 'Failed to create artist profile' }, 500)
    return c.json(sanitizeMe(artist), 201)
  })

  // Get current user's artist profile
  routes.get('/me', authGuard(), async (c) => {
    const artistSvc = c.get('artistService')
    const hallSvc = c.get('hallService')
    const authUser = getAuthUser(c)
    const raw = await artistSvc.getByUserId(authUser!.userId)
    if (!raw) return c.json({ error: 'NOT_FOUND', message: 'Artist profile not found' }, 404)

    // Auto-create hall if missing (e.g. artist created before hall auto-creation was added)
    if (!raw.hall) {
      const hall = await hallSvc.getOrCreate(raw.id, raw.user.displayName ?? 'Artist')
      return c.json(sanitizeMe({ ...raw, hall }))
    }

    return c.json(sanitizeMe(raw))
  })

  routes.get('/', async (c) => {
    const svc = c.get('artistService')
    const q = listQuerySchema.parse(c.req.query())
    const result = await svc.list(q)
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
    return c.json(await svc.update(artistId, parsed.data))
  })

  routes.get('/:id/artworks', async (c) => {
    const svc = c.get('artistService')
    const { page, pageSize } = artworksQuerySchema.parse(c.req.query())
    return c.json(await svc.getArtworks(c.req.param('id'), page, pageSize))
  })

  routes.get('/:id/hall', async (c) => {
    const hallSvc = c.get('hallService')
    const hall = await hallSvc.getByArtistId(c.req.param('id'))
    if (!hall) return c.json({ error: 'NOT_FOUND', message: 'Hall not found' }, 404)
    return c.json(toHallDto(hall))
  })

  return routes
}
