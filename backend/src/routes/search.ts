import { Hono } from 'hono'
import { ArtworkService } from '../services/artwork.service'

type SearchRouteEnv = {
  Variables: {
    artworkService: ArtworkService
  }
}

export function createSearchRoutes() {
  const routes = new Hono<SearchRouteEnv>()

  routes.get('/', async (c) => {
    const svc = c.get('artworkService')
    const query = c.req.query('q')
    if (!query || query.trim().length === 0) {
      return c.json({ artworks: [], artists: [], total: 0, page: 1 })
    }
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('pageSize') ?? '20')
    const result = await svc.search(query.trim(), page, pageSize)
    return c.json(result)
  })

  return routes
}
