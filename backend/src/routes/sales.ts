import { Hono } from 'hono'
import { z } from 'zod'
import { authGuard, getAuthUser } from '../guards/auth'
import type { SaleService } from '../services/sale.service'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

type SalesRouteEnv = {
  Variables: {
    saleService: SaleService
  }
}

export function createSalesRoutes() {
  const routes = new Hono<SalesRouteEnv>()

  routes.get('/me', authGuard(), async (c) => {
    const svc = c.get('saleService')
    const authUser = getAuthUser(c)
    const { page, pageSize } = paginationSchema.parse(c.req.query())
    return c.json(await svc.getPurchasedArtworksByUser(authUser!.userId, page, pageSize))
  })

  routes.get('/artist', authGuard(), async (c) => {
    const svc = c.get('saleService')
    const authUser = getAuthUser(c)
    const { page, pageSize } = paginationSchema.parse(c.req.query())
    return c.json(await svc.getArtistSalesByUser(authUser!.userId, page, pageSize))
  })

  return routes
}
