import { Hono } from 'hono'
import { z } from 'zod'
import { ArtworkService } from '../services/artwork.service'

type SearchRouteEnv = {
  Variables: {
    artworkService: ArtworkService
  }
}

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export function createSearchRoutes() {
  const routes = new Hono<SearchRouteEnv>()

  routes.get('/', async (c) => {
    const svc = c.get('artworkService')
    const parsed = searchQuerySchema.safeParse(c.req.query())
    if (!parsed.success) {
      return c.json({ artworks: [], artists: [], total: 0, page: 1 })
    }
    const { q, page, pageSize } = parsed.data
    const result = await svc.search(q.trim(), page, pageSize)
    return c.json(result)
  })

  return routes
}
