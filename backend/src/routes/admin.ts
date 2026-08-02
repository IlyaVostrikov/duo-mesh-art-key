import { Hono } from 'hono'
import { z } from 'zod'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { errorResponse } from '../http/errors'
import type { AdminService } from '../services/admin.service'

type AdminRouteEnv = {
  Variables: {
    adminService: AdminService
  }
}

const setRoleSchema = z.object({ role: z.enum(['GUEST', 'ARTIST', 'COLLECTOR', 'ADMIN']) })
const verifyArtistSchema = z.object({ verified: z.boolean() })
const setArtworkStatusSchema = z.object({ status: z.enum(['DRAFT', 'LISTED', 'IN_EXHIBITION', 'RESERVED', 'ARCHIVED']) })
const listQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })

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
    const q = listQuerySchema.parse(c.req.query())
    const search = c.req.query('search') || undefined
    const role = c.req.query('role') || undefined
    return c.json(await svc.listUsers({ page: q.page, pageSize: q.pageSize, search, role }))
  })

  routes.patch('/users/:userId/role', async (c) => {
    const svc = c.get('adminService')
    const authUser = getAuthUser(c)
    const body = setRoleSchema.safeParse(await c.req.json())
    if (!body.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', body.error.issues), 400)
    return c.json(await svc.setUserRole(c.req.param('userId'), body.data.role, authUser!.userId))
  })

  // ─── Artists ───
  routes.patch('/artists/:artistId/verify', async (c) => {
    const svc = c.get('adminService')
    const body = verifyArtistSchema.safeParse(await c.req.json())
    if (!body.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', body.error.issues), 400)
    return c.json(await svc.verifyArtist(c.req.param('artistId'), body.data.verified))
  })

  // ─── Artworks ───
  routes.get('/artworks', async (c) => {
    const svc = c.get('adminService')
    const q = listQuerySchema.parse(c.req.query())
    const status = c.req.query('status') || undefined
    return c.json(await svc.listArtworks({ page: q.page, pageSize: q.pageSize, status }))
  })

  routes.patch('/artworks/:artworkId/status', async (c) => {
    const svc = c.get('adminService')
    const body = setArtworkStatusSchema.safeParse(await c.req.json())
    if (!body.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', body.error.issues), 400)
    return c.json(await svc.setArtworkStatus(c.req.param('artworkId'), body.data.status))
  })

  // Soft-delete (archive). Hard deletion is forbidden via admin API.
  routes.delete('/artworks/:artworkId', async (c) => {
    const svc = c.get('adminService')
    const force = c.req.query('force') === 'true'
    await svc.archiveArtwork(c.req.param('artworkId'), force)
    return c.json({ ok: true })
  })

  return routes
}
