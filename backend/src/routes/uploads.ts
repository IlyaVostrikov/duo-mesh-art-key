import { Hono } from 'hono'
import { z } from 'zod'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { UploadValidationError, type UploadService } from '../services/upload.service'

const presignedSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(128),
  byteSize: z.number().int().positive(),
  visibility: z.enum(['public', 'private']).optional(),
})

const downloadUrlSchema = z.object({ key: z.string().min(1) })

const cleanupSchema = z.object({ olderThanHours: z.coerce.number().int().positive().default(24) })

type UploadRouteEnv = {
  Variables: {
    uploadService: UploadService
  }
}

export function createUploadRoutes() {
  const routes = new Hono<UploadRouteEnv>()

  // Local disk upload (FormData)
  routes.post('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const formData = await c.req.formData()
    const svc = c.get('uploadService')

    try {
      const { files, hashes } = await svc.processUploads(authUser.userId, formData)
      return c.json({ files, hashes }, 201)
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      throw err
    }
  })

  // Presigned upload URL (Spaces/S3)
  routes.post('/presigned', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const svc = c.get('uploadService')
    const body = await c.req.json()
    const parsed = presignedSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    try {
      const result = await svc.createPresignedUpload({
        userId: authUser.userId,
        fileName: parsed.data.fileName,
        fileType: parsed.data.fileType,
        byteSize: parsed.data.byteSize,
        visibility: parsed.data.visibility,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return c.json({ error: err.code, message: err.message }, 400)
      }
      if (err instanceof Error && err.message.includes('not configured')) {
        return c.json({ error: 'NOT_CONFIGURED', message: err.message }, 501)
      }
      throw err
    }
  })

  // Generate download URL for a stored object
  routes.post('/download-url', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('uploadService')
    const parsed = downloadUrlSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)

    try {
      const result = await svc.createDownloadUrl(parsed.data.key)
      return c.json(result, 200)
    } catch (err) {
      if (err instanceof Error && err.message.includes('not configured')) {
        return c.json({ error: 'NOT_CONFIGURED', message: err.message }, 501)
      }
      throw err
    }
  })

  // Admin: cleanup orphaned local files
  routes.post('/cleanup', authGuard(), requireRole('ADMIN'), async (c) => {
    const svc = c.get('uploadService')
    const parsed = cleanupSchema.safeParse(await c.req.json().catch(() => ({})))
    const olderThanHours = parsed.success ? parsed.data.olderThanHours : 24

    const result = await svc.cleanupOrphaned(olderThanHours)
    return c.json(result, 200)
  })

  // Delete a file (S3 or local disk)
  routes.delete('/:key{.+}', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('uploadService')
    const key = decodeURIComponent(c.req.param('key'))

    try {
      await svc.deleteFile(key)
      return c.json({ ok: true }, 200)
    } catch {
      return c.json({ error: 'DELETE_FAILED', message: 'Failed to delete file' }, 500)
    }
  })

  return routes
}
