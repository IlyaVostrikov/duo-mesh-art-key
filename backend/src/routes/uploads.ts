import { Hono } from 'hono'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { UploadValidationError, type UploadService } from '../services/upload.service'

type UploadRouteEnv = {
  Variables: {
    uploadService: UploadService
  }
}

export function createUploadRoutes() {
  const routes = new Hono<UploadRouteEnv>()

  routes.post('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const formData = await c.req.formData()
    const svc = c.get('uploadService')

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
