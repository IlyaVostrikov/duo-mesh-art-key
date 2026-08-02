import { Hono } from 'hono'
import { createInquirySchema } from '@duo-mesh/contracts'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { errorResponse } from '../http/errors'
import type { InquiryService } from '../services/inquiry.service'
import type { ArtistService } from '../services/artist.service'
import type { ArtworkService } from '../services/artwork.service'

type InquiryRouteEnv = {
  Variables: {
    inquiryService: InquiryService
    artistService: ArtistService
    artworkService: ArtworkService
  }
}

export function createInquiryRoutes() {
  const routes = new Hono<InquiryRouteEnv>()

  routes.post('/', async (c) => {
    const svc = c.get('inquiryService')
    const body = await c.req.json()
    const parsed = createInquirySchema.safeParse(body)
    if (!parsed.success) {
      return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)
    }

    // Verify artwork exists and is publicly visible
    const artworkSvc = c.get('artworkService')
    const artwork = await artworkSvc.getById(parsed.data.artworkId)
    if (!artwork) {
      return c.json(errorResponse('NOT_FOUND', 'Artwork not found'), 404)
    }

    const inquiry = await svc.create({ ...parsed.data, message: parsed.data.message ?? '' })
    return c.json(inquiry, 201)
  })

  routes.get('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('inquiryService')
    const artistSvc = c.get('artistService')
    const authUser = getAuthUser(c)

    const artist = await artistSvc.getByUserId(authUser!.userId)
    if (!artist) return c.json(errorResponse('NOT_FOUND', 'Artist profile not found'), 404)

    return c.json(await svc.listForArtist(artist.id))
  })

  return routes
}
