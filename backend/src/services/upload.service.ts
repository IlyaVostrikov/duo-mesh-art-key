import { mkdir, unlink, readdir, stat, rmdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'

const ALLOWED_3D = new Set(['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'])
const ALLOWED_IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg'])
const ALLOWED_TEXTURE = new Set(['bin', 'hdr', 'exr', 'ktx2'])
const MAX_FILES_PER_REQUEST = 50
const MAX_ZIP_ENTRIES = 200

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
  const isZip = ext === 'zip'
  if (!isImage && !is3D && !isZip) {
    throw new UploadValidationError(`Unsupported file type: .${ext}`)
  }
  return { isImage, is3D, isZip }
}

import type { StorageService } from '../storage/service'

export interface UploadConfig {
  maxImageBytes: number
  max3DBytes: number
  storage?: StorageService | null
  baseDir: string
}

export class UploadService {
  private readonly maxImageBytes: number
  private readonly max3DBytes: number
  private readonly storage: StorageService | null
  private readonly baseDir: string

  constructor(config: UploadConfig) {
    this.maxImageBytes = config.maxImageBytes
    this.max3DBytes = config.max3DBytes
    this.storage = config.storage ?? null
    this.baseDir = config.baseDir
  }

  // ── Local disk upload (existing) ──

  async processUploads(userId: string, formData: FormData) {
    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`

    const files: Array<{ name: string; url: string; size: number; type: string }> = []
    const written: string[] = []
    const hashes: Record<string, string> = {}

    try {
      for (const entry of formData.values()) {
        if (typeof entry === 'string' || !('name' in entry)) continue
        const file = entry as unknown as File

        if (files.length >= MAX_FILES_PER_REQUEST) {
          throw new UploadValidationError(`Too many files (max ${MAX_FILES_PER_REQUEST})`)
        }

        const ext = extension(file.name)
        if (!ext) {
          throw new UploadValidationError(`Cannot determine file type: ${file.name}`)
        }

        // ── ZIP archive: extract and process each entry ──
        if (ext === 'zip') {
          const zipResult = await this.extractZip(userId, datePath, file)
          for (const zf of zipResult.files) {
            if (files.length >= MAX_FILES_PER_REQUEST) {
              throw new UploadValidationError(`Too many files after extraction (max ${MAX_FILES_PER_REQUEST})`)
            }
            files.push(zf)
          }
          written.push(...zipResult.written)
          Object.assign(hashes, zipResult.hashes)
          continue
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
        const dir = join(this.baseDir, userId, datePath)

        await mkdir(dir, { recursive: true })
        const filePath = join(dir, `${uuid}-${sanitized}`)

        const buffer = await file.arrayBuffer()
        await Bun.write(filePath, new Uint8Array(buffer))
        written.push(filePath)

        // Compute SHA-256 hash of the file content for integrity verification
        const hasher = new Bun.CryptoHasher('sha256')
        hasher.update(new Uint8Array(buffer))
        hashes[file.name] = hasher.digest('hex') as string

        files.push({ name: file.name, url: `/api/uploads/${key}`, size: file.size, type: file.type })
      }
    } catch (err) {
      if (err instanceof UploadValidationError) throw err
      await Promise.allSettled(written.map((p) => unlink(p).catch(() => {})))
      throw err
    }

    if (files.length === 0) {
      throw new UploadValidationError('No files provided')
    }

    return { files, hashes }
  }

  // ── ZIP extraction ──
  // Extracts files preserving directory structure under a single bundle UUID.
  // This keeps relative references intact (e.g. glTF → .bin / textures/).

  private async extractZip(
    userId: string,
    datePath: string,
    zipFile: File,
  ): Promise<{ files: Array<{ name: string; url: string; size: number; type: string }>; written: string[]; hashes: Record<string, string> }> {
    const buffer = new Uint8Array(await zipFile.arrayBuffer())
    const extracted = unzipSync(buffer)
    const files: Array<{ name: string; url: string; size: number; type: string }> = []
    const written: string[] = []
    const hashes: Record<string, string> = {}

    const entries = Object.entries(extracted)
    if (entries.length > MAX_ZIP_ENTRIES) {
      throw new UploadValidationError(`Too many files in zip (max ${MAX_ZIP_ENTRIES})`)
    }

    // Single bundle UUID so relative paths between extracted files resolve
    const bundleUuid = crypto.randomUUID()
    const bundleDir = join(this.baseDir, userId, datePath, bundleUuid)
    await mkdir(bundleDir, { recursive: true })

    for (const [filename, data] of entries) {
      // Skip directories (fflate includes them as zero-length entries)
      if (data.length === 0 || filename.endsWith('/')) continue

      const ext = extension(filename)
      if (!ext) continue

      // Only extract allowed 3D, image, and texture files
      const is3D = ALLOWED_3D.has(ext)
      const isImage = ALLOWED_IMAGE.has(ext)
      const isTexture = ALLOWED_TEXTURE.has(ext)
      if (!is3D && !isImage && !isTexture) continue

      if (files.length >= MAX_FILES_PER_REQUEST) {
        throw new UploadValidationError(`Too many valid files in zip (max ${MAX_FILES_PER_REQUEST})`)
      }

      const maxSize = isImage ? this.maxImageBytes : this.max3DBytes
      if (data.length > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024)
        throw new UploadValidationError(`File too large in zip: ${filename} (max ${maxMB} MB)`)
      }

      // Sanitize each path component, preserving directory structure
      const sanitizedPath = filename
        .replace(/\\/g, '/')           // normalize Windows backslashes
        .split('/')
        .map((seg) => sanitizeFilename(seg))
        .join('/')

      const key = `${userId}/${datePath}/${bundleUuid}/${sanitizedPath}`
      const filePath = join(bundleDir, ...sanitizedPath.split('/'))

      await mkdir(join(bundleDir, ...sanitizedPath.split('/').slice(0, -1)), { recursive: true })
      await Bun.write(filePath, data)
      written.push(filePath)

      const hasher = new Bun.CryptoHasher('sha256')
      hasher.update(data)
      hashes[sanitizedPath] = hasher.digest('hex') as string

      const mimeType =
        ext === 'glb' ? 'model/gltf-binary' :
        ext === 'gltf' ? 'model/gltf+json' :
        ext === 'bin' ? 'application/octet-stream' :
        ext === 'hdr' ? 'image/vnd.radiance' :
        isImage ? `image/${ext === 'jpg' ? 'jpeg' : ext}` :
        'application/octet-stream'

      files.push({ name: filename, url: `/api/uploads/${key}`, size: data.length, type: mimeType })
    }

    if (files.length === 0) {
      throw new UploadValidationError('No valid 3D or image files found in zip. Supported: .glb, .gltf, .blend, .obj, .fbx, .stl, .usdz, .bin, .jpg, .png, .webp, .hdr')
    }

    return { files, written, hashes }
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

    await walk(this.baseDir)
    return { deleted, errors }
  }

  // ── Delete ──

  async deleteFile(key: string) {
    if (this.storage) {
      await this.storage.deleteObject(key)
    } else {
      // Prevent path traversal — ensure resolved path stays inside uploads/
      const resolved = resolve(key)
      const uploadsRoot = resolve(this.baseDir)
      if (!resolved.startsWith(uploadsRoot + sep)) {
        throw new UploadValidationError('Invalid file path')
      }
      try {
        await unlink(resolved)
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
