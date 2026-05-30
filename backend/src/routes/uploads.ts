import { Hono } from 'hono'
import { mkdir } from 'node:fs/promises'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { authGuard, requireRole, getAuthUser } from '../guards/auth'

const ALLOWED_3D = new Set(['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'])
const ALLOWED_IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg'])
const MAX_3D_BYTES = 100 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_FILES_PER_REQUEST = 10

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(-120)
}

function extension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function createUploadRoutes() {
  const routes = new Hono()

  routes.post('/', authGuard(), requireRole('ARTIST', 'ADMIN'), async (c) => {
    const authUser = getAuthUser(c)!
    const formData = await c.req.formData()
    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`

    const files: Array<{ name: string; url: string; size: number; type: string }> = []
    const written: string[] = []

    try {
      for (const entry of formData.values()) {
        const file = entry as unknown as File | null
        if (!file || typeof file.name !== 'string') continue

        if (files.length >= MAX_FILES_PER_REQUEST) {
          return c.json({ error: 'VALIDATION', message: `Too many files (max ${MAX_FILES_PER_REQUEST})` }, 400)
        }

        const ext = extension(file.name)
        if (!ext) {
          return c.json({ error: 'VALIDATION', message: `Cannot determine file type: ${file.name}` }, 400)
        }

        const isImage = ALLOWED_IMAGE.has(ext)
        const is3D = ALLOWED_3D.has(ext)
        if (!isImage && !is3D) {
          return c.json({ error: 'VALIDATION', message: `Unsupported file type: .${ext}` }, 400)
        }

        const maxSize = isImage ? MAX_IMAGE_BYTES : MAX_3D_BYTES
        if (file.size > maxSize) {
          const maxMB = Math.round(maxSize / 1024 / 1024)
          return c.json({ error: 'VALIDATION', message: `File too large: ${file.name} (max ${maxMB} MB)` }, 400)
        }

        const uuid = crypto.randomUUID()
        const sanitized = sanitizeFilename(file.name)
        const key = `${authUser.userId}/${datePath}/${uuid}-${sanitized}`
        const dir = join('uploads', authUser.userId, datePath)

        await mkdir(dir, { recursive: true })
        const filePath = join(dir, `${uuid}-${sanitized}`)

        const buffer = await file.arrayBuffer()
        await Bun.write(filePath, new Uint8Array(buffer))
        written.push(filePath)

        files.push({ name: file.name, url: `/uploads/${key}`, size: file.size, type: file.type })
      }
    } catch (err) {
      await Promise.allSettled(written.map((p) => unlink(p).catch(() => {})))
      throw err
    }

    if (files.length === 0) {
      return c.json({ error: 'VALIDATION', message: 'No files provided' }, 400)
    }

    return c.json({ files }, 201)
  })

  return routes
}
