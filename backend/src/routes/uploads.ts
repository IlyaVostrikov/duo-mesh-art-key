import { Hono } from 'hono'
import { z } from 'zod'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'
import { errorResponse } from '../http/errors'
import { UploadValidationError, type UploadService } from '../services/upload.service'

const presignedSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(128),
  byteSize: z.number().int().positive(),
  visibility: z.enum(['public', 'private']).optional(),
})

const downloadUrlSchema = z.object({ key: z.string().min(1) })
const finalizeModelSchema = z.object({ key: z.string().min(1).max(1024) })

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
        return c.json(errorResponse(err.code, err.message), 400)
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
      return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)
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
        return c.json(errorResponse(err.code, err.message), 400)
      }
      if (err instanceof Error && err.message.includes('not configured')) {
        return c.json(errorResponse('NOT_CONFIGURED', err.message), 501)
      }
      throw err
    }
  })

  // Finalize a directly uploaded ZIP model bundle. The server extracts the
  // scene and its relative .bin/textures into public storage so model-viewer
  // can load the glTF without requiring the browser to unpack the archive.
  routes.post('/finalize-model', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const svc = c.get('uploadService')
    const parsed = finalizeModelSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)

    try {
      const result = await svc.finalizeModelBundle(authUser.userId, parsed.data.key)
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return c.json(errorResponse('VALIDATION_ERROR', err.message), 400)
      }
      if (err instanceof Error && err.message.includes('not configured')) {
        return c.json(errorResponse('NOT_CONFIGURED', err.message), 501)
      }
      throw err
    }
  })

  // Generate download URL for a stored object.
  // P0-10: ownership enforced via key prefix — upload paths encode userId.
  routes.post('/download-url', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('uploadService')
    const authUser = getAuthUser(c)!
    const parsed = downloadUrlSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json(errorResponse('VALIDATION_ERROR', 'Invalid request payload', parsed.error.issues), 400)

    // Verify ownership: key must start with uploads/{userId}/ unless admin
    if (authUser.role !== 'ADMIN' && !parsed.data.key.startsWith(`uploads/${authUser.userId}/`)) {
      return c.json(errorResponse('FORBIDDEN', 'You do not own this file'), 403)
    }

    try {
      const result = await svc.createDownloadUrl(parsed.data.key)
      return c.json(result, 200)
    } catch (err) {
      if (err instanceof Error && err.message.includes('not configured')) {
        return c.json(errorResponse('NOT_CONFIGURED', err.message), 501)
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

  // Delete a file (S3 or local disk).
  // P0-10: ownership enforced via key prefix — upload paths encode userId.
  routes.delete('/:key{.+}', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const svc = c.get('uploadService')
    const authUser = getAuthUser(c)!
    const key = decodeURIComponent(c.req.param('key'))

    // Verify ownership: key must start with uploads/{userId}/ unless admin
    if (authUser.role !== 'ADMIN' && !key.startsWith(`uploads/${authUser.userId}/`)) {
      return c.json(errorResponse('FORBIDDEN', 'You do not own this file'), 403)
    }

    try {
      await svc.deleteFile(key)
      return c.json({ ok: true }, 200)
    } catch {
      return c.json(errorResponse('DELETE_FAILED', 'Failed to delete file'), 500)
    }
  })

  return routes
}
