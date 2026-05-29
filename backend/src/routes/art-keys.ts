import { Hono } from 'hono'
import { ArtKeyService } from '../services/art-key.service'

type ArtKeyRouteEnv = {
  Variables: {
    artKeyService: ArtKeyService
  }
}

export function createArtKeyRoutes() {
  const routes = new Hono<ArtKeyRouteEnv>()

  // Public: verify an ArtKey by keyCode
  routes.get('/:keyCode', async (c) => {
    const svc = c.get('artKeyService')
    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    return c.json(result)
  })

  return routes
}
