import { Hono } from 'hono'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { UploadService, UploadValidationError } from '../services/upload.service'

export function createUploadRoutes() {
  const routes = new Hono()

  routes.post('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const formData = await c.req.formData()
    const svc = new UploadService()

    try {
      const files = await svc.processUploads(authUser.userId, formData)
      return c.json({ files }, 201)
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      throw err
    }
  })

  return routes
}
