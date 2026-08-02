import { Hono } from 'hono'
import { errorResponse } from '../http/errors'
import type { SigningService } from '../services/signing.service'

type PublicKeyRouteEnv = {
  Variables: {
    signingService: SigningService
  }
}

export function createPublicKeyRoutes() {
  const routes = new Hono<PublicKeyRouteEnv>()

  // Get all artist signing keys
  routes.get('/artist/:artistId', async (c) => {
    const svc = c.get('signingService')
    const keys = await svc.getArtistKeys(c.req.param('artistId'))
    return c.json({ keys })
  })

  // Get platform public key
  routes.get('/platform', async (c) => {
    const svc = c.get('signingService')
    const key = await svc.getPlatformActivePublicKey()
    if (!key) return c.json(errorResponse('NOT_FOUND', 'Platform signing key not found'), 404)
    return c.json(key)
  })

  return routes
}
