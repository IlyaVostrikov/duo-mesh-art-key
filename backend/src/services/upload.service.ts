import { mkdir, unlink, readdir, stat, rmdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ALLOWED_3D = new Set(['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'])
const ALLOWED_IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg'])
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

function assertExt(ext: string, fileName: string) {
  const isImage = ALLOWED_IMAGE.has(ext)
  const is3D = ALLOWED_3D.has(ext)
  if (!isImage && !is3D) {
    throw new UploadValidationError(`Unsupported file type: .${ext}`)
  }
  return { isImage, is3D }
}

import type { StorageService } from '../storage/service'

export interface UploadConfig {
  maxImageBytes: number
  max3DBytes: number
  storage?: StorageService | null
}

export class UploadService {
  private readonly maxImageBytes: number
  private readonly max3DBytes: number
  private readonly storage: StorageService | null

  constructor(config: UploadConfig) {
    this.maxImageBytes = config.maxImageBytes
    this.max3DBytes = config.max3DBytes
    this.storage = config.storage ?? null
  }

  // ── Local disk upload (existing) ──

  async processUploads(userId: string, formData: FormData) {
    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`

    const files: Array<{ name: string; url: string; size: number; type: string }> = []
    const written: string[] = []

    try {
      for (const entry of formData.values()) {
        // FormDataEntryValue = string | File; duck-type the File branch
        if (typeof entry === 'string' || !('name' in entry)) continue
        const file = entry as unknown as File

        if (files.length >= MAX_FILES_PER_REQUEST) {
          throw new UploadValidationError(`Too many files (max ${MAX_FILES_PER_REQUEST})`)
        }

        const ext = extension(file.name)
        if (!ext) {
          throw new UploadValidationError(`Cannot determine file type: ${file.name}`)
        }

        const { isImage } = assertExt(ext, file.name)
        const maxSize = isImage ? this.maxImageBytes : this.max3DBytes
        if (file.size > maxSize) {
          const maxMB = Math.round(maxSize / 1024 / 1024)
          throw new UploadValidationError(`File too large: ${file.name} (max ${maxMB} MB)`)
        }

        const uuid = crypto.randomUUID()
        const sanitized = sanitizeFilename(file.name)
        const key = `${userId}/${datePath}/${uuid}-${sanitized}`
        const dir = join('uploads', userId, datePath)

        await mkdir(dir, { recursive: true })
        const filePath = join(dir, `${uuid}-${sanitized}`)

        const buffer = await file.arrayBuffer()
        await Bun.write(filePath, new Uint8Array(buffer))
        written.push(filePath)

        files.push({ name: file.name, url: `/uploads/${key}`, size: file.size, type: file.type })
      }
    } catch (err) {
      if (err instanceof UploadValidationError) throw err
      await Promise.allSettled(written.map((p) => unlink(p).catch(() => {})))
      throw err
    }

    if (files.length === 0) {
      throw new UploadValidationError('No files provided')
    }

    return files
  }

  // ── Presigned upload (Spaces/S3) ──

  async createPresignedUpload(opts: {
    userId: string
    fileName: string
    fileType: string
    byteSize: number
    visibility?: 'public' | 'private'
  }) {
    if (!this.storage) {
      throw new Error('Storage service is not configured. Use local upload or set SPACES_* env vars.')
    }

    const ext = extension(opts.fileName)
    if (!ext) throw new UploadValidationError(`Cannot determine file type: ${opts.fileName}`)
    assertExt(ext, opts.fileName)

    const maxSize = ALLOWED_IMAGE.has(ext) ? this.maxImageBytes : this.max3DBytes
    if (opts.byteSize > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024)
      throw new UploadValidationError(`File too large: ${opts.fileName} (max ${maxMB} MB)`)
    }

    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
    const uuid = crypto.randomUUID()
    const sanitized = sanitizeFilename(opts.fileName)
    const key = `uploads/${opts.userId}/${datePath}/${uuid}-${sanitized}`

    return this.storage.createUploadUrl({
      key,
      contentType: opts.fileType,
      byteSize: opts.byteSize,
      visibility: opts.visibility ?? 'public',
    })
  }

  async createDownloadUrl(key: string) {
    if (!this.storage) {
      throw new Error('Storage service is not configured.')
    }
    return this.storage.createDownloadUrl({ key })
  }

  // ── Cleanup orphaned local files ──

  async cleanupOrphaned(olderThanHours = 24): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = []
    let deleted = 0
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000

    async function walk(dir: string): Promise<void> {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch { return }

      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
          // Try to remove empty dirs
          try {
            const remaining = await readdir(full)
            if (remaining.length === 0) await rmdir(full)
          } catch { /* not empty or no permission — skip */ }
        } else if (entry.isFile()) {
          try {
            const s = await stat(full)
            if (s.mtimeMs < cutoff) {
              await unlink(full)
              deleted++
            }
          } catch (err) {
            errors.push(`${relative('.', full)}: ${String(err)}`)
          }
        }
      }
    }

    await walk('uploads')
    return { deleted, errors }
  }

  // ── Delete ──

  async deleteFile(key: string) {
    if (this.storage) {
      await this.storage.deleteObject(key)
    } else {
      // Key format: uploads/<userId>/<year>/<month>/<day>/<uuid>-<filename>
      const filePath = join('.', key)
      try {
        await unlink(filePath)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    }
  }
}

export class UploadValidationError extends Error {
  readonly status = 400
  readonly code = 'VALIDATION'
  constructor(message: string) {
    super(message)
    this.name = 'UploadValidationError'
  }
}
