import { Hono } from 'hono'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import type { AdminService } from '../services/admin.service'
import { ValidationError, NotFoundError, ForbiddenError } from '../services/admin.service'

type AdminRouteEnv = {
  Variables: {
    adminService: AdminService
  }
}

export function createAdminRoutes() {
  const routes = new Hono<AdminRouteEnv>()

  // All admin routes require ADMIN role
  routes.use('*', authGuard(), requireRole('ADMIN'))

  // ─── Stats ───
  routes.get('/stats', async (c) => {
    const svc = c.get('adminService')
    return c.json(await svc.stats())
  })

  // ─── Users ───
  routes.get('/users', async (c) => {
    const svc = c.get('adminService')
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('pageSize') ?? '20')
    const search = c.req.query('search') ?? undefined
    const role = c.req.query('role') ?? undefined
    return c.json(await svc.listUsers({ page, pageSize, search, role }))
  })

  routes.patch('/users/:userId/role', async (c) => {
    const svc = c.get('adminService')
    const authUser = getAuthUser(c)
    const { role } = await c.req.json()
    if (!['GUEST', 'ARTIST', 'COLLECTOR', 'ADMIN'].includes(role)) {
      return c.json({ error: 'VALIDATION', message: 'Invalid role' }, 400)
    }
    try {
      return c.json(await svc.setUserRole(c.req.param('userId'), role, authUser!.userId))
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return c.json({ error: 'FORBIDDEN', message: err.message }, 403)
      }
      if (err instanceof NotFoundError) {
        return c.json({ error: 'NOT_FOUND', message: err.message }, 404)
      }
      throw err
    }
  })

  // ─── Artists ───
  routes.patch('/artists/:artistId/verify', async (c) => {
    const svc = c.get('adminService')
    const { verified } = await c.req.json()
    return c.json(await svc.verifyArtist(c.req.param('artistId'), Boolean(verified)))
  })

  // ─── Artworks ───
  routes.get('/artworks', async (c) => {
    const svc = c.get('adminService')
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('pageSize') ?? '20')
    const status = c.req.query('status') ?? undefined
    return c.json(await svc.listArtworks({ page, pageSize, status }))
  })

  routes.patch('/artworks/:artworkId/status', async (c) => {
    const svc = c.get('adminService')
    const { status } = await c.req.json()
    try {
      return c.json(await svc.setArtworkStatus(c.req.param('artworkId'), status))
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: 'VALIDATION', message: err.message }, 400)
      }
      throw err
    }
  })

  // Soft-delete (archive). Hard deletion is forbidden via admin API.
  routes.delete('/artworks/:artworkId', async (c) => {
    const svc = c.get('adminService')
    const force = c.req.query('force') === 'true'
    try {
      await svc.archiveArtwork(c.req.param('artworkId'), force)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return c.json({ error: 'FORBIDDEN', message: err.message }, 403)
      }
      if (err instanceof NotFoundError) {
        return c.json({ error: 'NOT_FOUND', message: err.message }, 404)
      }
      throw err
    }
  })

  return routes
}
