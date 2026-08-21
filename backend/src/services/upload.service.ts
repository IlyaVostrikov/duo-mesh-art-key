import { mkdir, unlink, readdir, stat, rmdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'

const ALLOWED_3D = new Set(['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'])
const ALLOWED_IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg'])
const ALLOWED_TEXTURE = new Set(['bin', 'hdr', 'exr', 'ktx2'])
const ALLOWED_BUNDLE = new Set([...ALLOWED_3D, ...ALLOWED_IMAGE, ...ALLOWED_TEXTURE, 'txt', 'json'])
const MAX_FILES_PER_REQUEST = 50
const MAX_ZIP_ENTRIES = 200
const MAX_ZIP_COMPRESSED_BYTES = 100 * 1024 * 1024    // 100 MB — archive on disk
const MAX_ZIP_UNCOMPRESSED_BYTES = 500 * 1024 * 1024  // 500 MB — total after extraction
const MAX_ZIP_COMPRESSION_RATIO = 100                  // reject if uncompressed > 100× compressed

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(-120)
}

function extension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

/** Read ZIP central directory to get entry count and total uncompressed size WITHOUT decompressing. */
function readZipMetadata(buffer: Uint8Array): { entryCount: number; totalUncompressed: number } {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const fileSize = buffer.length

  // Search backwards from end for EOCD signature (max 65535-byte comment + 22-byte record)
  let eocdOffset = -1
  const searchStart = Math.max(0, fileSize - 65535 - 22)
  for (let i = fileSize - 22; i >= searchStart; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new UploadValidationError('Invalid ZIP: EOCD signature not found')

  const entryCount = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)

  let totalUncompressed = 0
  let pos = cdOffset
  for (let i = 0; i < entryCount; i++) {
    if (pos + 46 > fileSize) throw new UploadValidationError('Invalid ZIP: central directory truncated')
    if (view.getUint32(pos, true) !== 0x02014b50) {
      throw new UploadValidationError('Invalid ZIP: central directory entry signature not found')
    }
    totalUncompressed += view.getUint32(pos + 24, true)
    const fileNameLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const entrySize = 46 + fileNameLen + extraLen + commentLen
    if (entrySize > fileSize - pos) throw new UploadValidationError('Invalid ZIP: central directory entry overflows')
    pos += entrySize
  }

  return { entryCount, totalUncompressed }
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
    const compressedSize = zipFile.size

    // Layer 1: reject overly large compressed archives
    if (compressedSize > MAX_ZIP_COMPRESSED_BYTES) {
      const maxMB = Math.round(MAX_ZIP_COMPRESSED_BYTES / 1024 / 1024)
      throw new UploadValidationError(`ZIP archive too large (max ${maxMB} MB)`)
    }

    const buffer = new Uint8Array(await zipFile.arrayBuffer())

    // Pre-validate using ZIP central directory metadata — runs BEFORE decompression
    const meta = readZipMetadata(buffer)
    if (meta.entryCount > MAX_ZIP_ENTRIES) {
      throw new UploadValidationError(`Too many files in zip (max ${MAX_ZIP_ENTRIES})`)
    }
    if (meta.totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
      const maxMB = Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / 1024 / 1024)
      throw new UploadValidationError(`ZIP uncompressed size too large (max ${maxMB} MB)`)
    }
    if (compressedSize > 0 && meta.totalUncompressed / compressedSize > MAX_ZIP_COMPRESSION_RATIO) {
      throw new UploadValidationError(
        `Suspicious compression ratio detected (${Math.round(meta.totalUncompressed / compressedSize)}:1). Archive rejected.`,
      )
    }

    const extracted = unzipSync(buffer)

    const files: Array<{ name: string; url: string; size: number; type: string }> = []
    const written: string[] = []
    const hashes: Record<string, string> = {}

    const entries = Object.entries(extracted)
    // Belt-and-suspenders: catch metadata/actual mismatch in crafted ZIPs
    if (entries.length > MAX_ZIP_ENTRIES) {
      throw new UploadValidationError(`Too many files in zip (max ${MAX_ZIP_ENTRIES})`)
    }

    // Single bundle UUID so relative paths between extracted files resolve
    const bundleUuid = crypto.randomUUID()
    const bundleDir = join(this.baseDir, userId, datePath, bundleUuid)
    await mkdir(bundleDir, { recursive: true })

    try {
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
    } catch (err) {
      // Clean up partial extraction on any error
      await Promise.allSettled(written.map((p) => unlink(p).catch(() => {})))
      throw err
    }
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

  async finalizeModelBundle(userId: string, key: string) {
    const storage = this.storage
    if (!storage) {
      throw new Error('Storage service is not configured. Use local upload or set SPACES_* env vars.')
    }

    const normalizedKey = key.trim()
    if (!normalizedKey.startsWith(`uploads/${userId}/`)) {
      throw new UploadValidationError('You do not own this upload')
    }
    if (extension(normalizedKey) !== 'zip') {
      throw new UploadValidationError('Model bundle must be a .zip archive')
    }

    const compressed = await storage.readObjectBytes(normalizedKey)
    if (compressed.byteLength > MAX_ZIP_COMPRESSED_BYTES) {
      throw new UploadValidationError('ZIP archive too large (max 100 MB)')
    }

    let metadata: { entryCount: number; totalUncompressed: number }
    try {
      metadata = readZipMetadata(compressed)
    } catch (err) {
      if (err instanceof UploadValidationError) throw err
      throw new UploadValidationError('Invalid ZIP archive')
    }
    if (metadata.entryCount > MAX_ZIP_ENTRIES) {
      throw new UploadValidationError(`Too many files in zip (max ${MAX_ZIP_ENTRIES})`)
    }
    if (metadata.totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new UploadValidationError('ZIP uncompressed size too large (max 500 MB)')
    }
    if (compressed.byteLength > 0 && metadata.totalUncompressed / compressed.byteLength > MAX_ZIP_COMPRESSION_RATIO) {
      throw new UploadValidationError('Suspicious compression ratio detected. Archive rejected.')
    }

    let extracted: Record<string, Uint8Array>
    try {
      extracted = unzipSync(compressed)
    } catch {
      throw new UploadValidationError('Invalid ZIP archive')
    }

    const bundlePrefix = normalizedKey.slice(0, -'.zip'.length)
    const uploadedKeys: string[] = []
    let modelKey: string | undefined
    let modelName: string | undefined
    let modelType: string | undefined
    let totalBytes = 0

    const contentTypeFor = (ext: string) => ({
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      bin: 'application/octet-stream',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      hdr: 'image/vnd.radiance',
      txt: 'text/plain',
      json: 'application/json',
    } as Record<string, string>)[ext] ?? 'application/octet-stream'

    try {
      for (const [filename, data] of Object.entries(extracted)) {
        if (data.length === 0 || filename.endsWith('/')) continue
        const path = filename.replace(/\\/g, '/').trim()
        const segments = path.split('/').filter(Boolean)
        if (segments.some((segment) => segment === '.' || segment === '..')) {
          throw new UploadValidationError('ZIP contains an unsafe path')
        }
        const ext = extension(path)
        if (!ALLOWED_BUNDLE.has(ext)) continue
        if (data.length > this.max3DBytes && !ALLOWED_IMAGE.has(ext)) {
          throw new UploadValidationError(`File too large in zip: ${filename}`)
        }
        if (data.length > this.maxImageBytes && ALLOWED_IMAGE.has(ext)) {
          throw new UploadValidationError(`Image too large in zip: ${filename}`)
        }
        totalBytes += data.length
        if (totalBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
          throw new UploadValidationError('ZIP uncompressed size too large (max 500 MB)')
        }

        const safePath = segments.map(sanitizeFilename).join('/')
        if (!safePath) continue
        const object = await storage.putPublicObject({
          key: `${bundlePrefix}/${safePath}`,
          body: data,
          contentType: contentTypeFor(ext),
        })
        uploadedKeys.push(object.key)

        const lowerName = safePath.toLowerCase()
        if (ext === 'gltf' && (!modelKey || lowerName.endsWith('/scene.gltf') || lowerName === 'scene.gltf')) {
          modelKey = object.key
          modelName = safePath
          modelType = 'model/gltf+json'
        } else if (ext === 'glb' && !modelKey) {
          modelKey = object.key
          modelName = safePath
          modelType = 'model/gltf-binary'
        }
      }

      if (!modelKey) {
        throw new UploadValidationError('ZIP does not contain a .gltf or .glb scene')
      }

      return {
        archiveKey: normalizedKey,
        modelKey,
        modelName,
        modelType,
        modelUrl: storage.publicUrlForKey(modelKey),
        files: uploadedKeys,
      }
    } catch (err) {
      await Promise.allSettled(uploadedKeys.map((uploadedKey) => storage.deleteObject(uploadedKey)))
      throw err
    }
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
  readonly code = 'VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
    this.name = 'UploadValidationError'
  }
}
