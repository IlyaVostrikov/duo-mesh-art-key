import { Hono } from 'hono'
import { authGuard, getAuthUser, requireRole } from '../guards/auth'
import type { CollectionService } from '../services/collection.service'

type CollectionRouteEnv = {
  Variables: {
    collectionService: CollectionService
  }
}

export function createCollectionRoutes() {
  const routes = new Hono<CollectionRouteEnv>()

  routes.get('/', authGuard(), async (c) => {
    const svc = c.get('collectionService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.listSaved(authUser.userId))
  })

  routes.get('/saved-ids', authGuard(), async (c) => {
    const svc = c.get('collectionService')
    const authUser = getAuthUser(c)!
    return c.json({ artworkIds: await svc.listSavedIds(authUser.userId) })
  })

  routes.get('/:artworkId', authGuard(), async (c) => {
    const svc = c.get('collectionService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.getSaveStatus(authUser.userId, c.req.param('artworkId')))
  })

  routes.post('/:artworkId', authGuard(), requireRole('COLLECTOR', 'ADMIN'), async (c) => {
    const svc = c.get('collectionService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.saveArtwork(authUser.userId, c.req.param('artworkId')))
  })

  routes.delete('/:artworkId', authGuard(), requireRole('COLLECTOR', 'ADMIN'), async (c) => {
    const svc = c.get('collectionService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.unsaveArtwork(authUser.userId, c.req.param('artworkId')))
  })

  return routes
}
