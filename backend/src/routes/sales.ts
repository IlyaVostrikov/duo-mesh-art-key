import { Hono } from 'hono'
import { authGuard, getAuthUser } from '../guards/auth'
import type { SaleService } from '../services/sale.service'

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
    return c.json(await svc.getPurchasedArtworksByUser(authUser!.userId))
  })

  routes.get('/artist', authGuard(), async (c) => {
    const svc = c.get('saleService')
    const authUser = getAuthUser(c)
    return c.json(await svc.getArtistSalesByUser(authUser!.userId))
  })

  return routes
}
