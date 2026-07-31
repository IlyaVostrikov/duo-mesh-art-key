import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { AppEnv } from '../env'
import { AppError } from '../http/errors'

const maxObjectKeyLength = 1024

export type StorageObjectVisibility = 'public' | 'private'

export type StorageConfig = {
  region: string
  bucket: string
  endpoint: string
  cdnBaseUrl?: string
  accessKeyId: string
  secretAccessKey: string
  uploadMaxBytes: number
  uploadUrlTtlSeconds: number
  downloadUrlTtlSeconds: number
  publicCacheControl: string
}

export type CreateUploadUrlInput = {
  key: string
  contentType: string
  byteSize: number
  visibility?: StorageObjectVisibility
  cacheControl?: string
  expiresInSeconds?: number
}

export type CreateDownloadUrlInput = {
  key: string
  expiresInSeconds?: number
}

export type CreateObjectKeyInput = {
  namespace: string
  filename: string
  ownerId?: string
  id?: string
  now?: Date
}

export type PresignedUpload = {
  key: string
  uploadUrl: string
  method: 'PUT'
  headers: Record<string, string>
  contentLength: number
  expiresAt: string
  publicUrl?: string
}

export class StorageService {
  private readonly s3: S3Client

  constructor(
    private readonly config: StorageConfig,
    s3?: S3Client,
  ) {
    this.s3 =
      s3 ??
      new S3Client({
        endpoint: config.endpoint,
        // Use the configured region (e.g. "auto" for R2, "us-east-1" for DO Spaces)
        region: config.region,
        forcePathStyle: false,
        // Disable automatic CRC32 checksums — they break presigned PUT URLs when
        // the SDK pre-computes a checksum without the actual file body.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      })
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<PresignedUpload> {
    const key = assertSafeObjectKey(input.key)
    const contentType = assertContentType(input.contentType)
    const byteSize = assertByteSize(input.byteSize, this.config.uploadMaxBytes)
    const visibility = input.visibility ?? 'private'
    const acl = visibility === 'public' ? 'public-read' : 'private'
    const cacheControl =
      input.cacheControl ?? (visibility === 'public' ? this.config.publicCacheControl : undefined)
    const expiresInSeconds = input.expiresInSeconds ?? this.config.uploadUrlTtlSeconds

    assertSignedUrlTtl(expiresInSeconds)

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: byteSize,
      ACL: acl,
      ...(cacheControl ? { CacheControl: cacheControl } : {}),
    })
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-amz-acl': acl,
    }

    if (cacheControl) {
      headers['Cache-Control'] = cacheControl
    }

    return {
      key,
      uploadUrl,
      method: 'PUT',
      headers,
      contentLength: byteSize,
      expiresAt: expiresAt(expiresInSeconds).toISOString(),
      ...(visibility === 'public' ? { publicUrl: this.publicUrlForKey(key) } : {}),
    }
  }

  async createDownloadUrl(input: CreateDownloadUrlInput) {
    const key = assertSafeObjectKey(input.key)
    const expiresInSeconds = input.expiresInSeconds ?? this.config.downloadUrlTtlSeconds

    assertSignedUrlTtl(expiresInSeconds)

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    })

    return {
      key,
      downloadUrl: await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds }),
      expiresAt: expiresAt(expiresInSeconds).toISOString(),
    }
  }

  async deleteObject(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: assertSafeObjectKey(key),
      }),
    )
  }

  publicUrlForKey(key: string) {
    assertSafeObjectKey(key)
    if (this.config.cdnBaseUrl) {
      return joinUrlPath(this.config.cdnBaseUrl, key)
    }
    // Derive public URL from endpoint host by inserting the bucket name:
    // R2: https://<id>.r2.cloudflarestorage.com → https://<bucket>.<id>.r2.cloudflarestorage.com
    const endpointUrl = new URL(this.config.endpoint)
    endpointUrl.hostname = `${this.config.bucket}.${endpointUrl.hostname}`
    return joinUrlPath(endpointUrl.toString(), key)
  }
}

export function createStorageServiceFromEnv(env: AppEnv) {
  const config = storageConfigFromEnv(env)
  return config ? new StorageService(config) : null
}

export function storageConfigFromEnv(env: AppEnv): StorageConfig | null {
  if (
    !env.SPACES_REGION ||
    !env.SPACES_BUCKET ||
    !env.SPACES_ENDPOINT ||
    !env.SPACES_ACCESS_KEY_ID ||
    !env.SPACES_SECRET_ACCESS_KEY
  ) {
    return null
  }

  return {
    region: env.SPACES_REGION,
    bucket: env.SPACES_BUCKET,
    endpoint: env.SPACES_ENDPOINT,
    cdnBaseUrl: env.SPACES_CDN_BASE_URL,
    accessKeyId: env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: env.SPACES_SECRET_ACCESS_KEY,
    uploadMaxBytes: env.SPACES_UPLOAD_MAX_BYTES,
    uploadUrlTtlSeconds: env.SPACES_UPLOAD_URL_TTL_SECONDS,
    downloadUrlTtlSeconds: env.SPACES_DOWNLOAD_URL_TTL_SECONDS,
    publicCacheControl: env.SPACES_PUBLIC_CACHE_CONTROL,
  }
}

export function createStorageObjectKey(input: CreateObjectKeyInput) {
  const now = input.now ?? new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const id = input.id ?? randomUUID()
  const segments = [
    sanitizePathSegment(input.namespace),
    input.ownerId ? sanitizePathSegment(input.ownerId) : undefined,
    yyyy,
    mm,
    dd,
    `${sanitizePathSegment(id)}-${sanitizeFilename(input.filename)}`,
  ].filter((segment): segment is string => Boolean(segment))

  return assertSafeObjectKey(segments.join('/'))
}

export function assertSafeObjectKey(key: string) {
  const normalizedKey = key.trim()

  if (!normalizedKey || normalizedKey.length > maxObjectKeyLength) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Storage object key is invalid')
  }

  if (normalizedKey.startsWith('/') || normalizedKey.endsWith('/')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Storage object key must be relative')
  }

  if (/[\u0000-\u001F\\]/.test(normalizedKey)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Storage object key contains unsupported characters')
  }

  if (
    normalizedKey
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Storage object key contains an unsafe path segment')
  }

  return normalizedKey
}

function assertContentType(contentType: string) {
  const normalizedContentType = contentType.trim().toLowerCase()

  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(normalizedContentType)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Upload content type is invalid')
  }

  return normalizedContentType
}

function assertByteSize(byteSize: number, uploadMaxBytes: number) {
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > uploadMaxBytes) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Upload size is outside the allowed range', {
      maxBytes: uploadMaxBytes,
    })
  }

  return byteSize
}

function assertSignedUrlTtl(expiresInSeconds: number) {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0 || expiresInSeconds > 7 * 24 * 60 * 60) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Signed URL expiration is outside the allowed range')
  }
}

function sanitizePathSegment(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Storage path segment is invalid')
  }

  return sanitized.slice(0, 120)
}

function sanitizeFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? 'file'
  const sanitized = basename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return (sanitized || 'file').slice(0, 120)
}

function joinUrlPath(baseUrl: string, key: string) {
  const url = new URL(baseUrl)
  const basePath = url.pathname.replace(/\/+$/, '')
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  url.pathname = `${basePath}/${encodedKey}`
  url.search = ''
  url.hash = ''

  return url.toString()
}

function expiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000)
}
