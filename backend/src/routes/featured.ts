import { Hono } from 'hono'
import type { FeaturedService } from '../services/featured.service'

type FeaturedRouteEnv = { Variables: { featuredService: FeaturedService } }

export function createFeaturedRoutes() {
  const routes = new Hono<FeaturedRouteEnv>()

  routes.get('/', async (c) => {
    const svc = c.get('featuredService')
    const data = await svc.getFeatured()
    return c.json(data)
  })

  return routes
}
