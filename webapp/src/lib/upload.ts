import { apiBaseUrl } from './api'

export type UploadedFile = {
  name: string
  url: string // publicUrl (R2) or key-based URL
  key: string // R2 object key for download/delete
  size: number
  type: string
}

export type UploadResult = {
  files: UploadedFile[]
}

/**
 * Upload a single file via presigned S3/R2 URL.
 * Uses the two-step flow: request presigned URL → PUT to storage.
 */
export async function uploadFile(file: File, accessToken: string): Promise<UploadedFile> {
  // Step 1: request presigned upload URL from backend
  const presignedRes = await fetch(`${apiBaseUrl}/api/uploads/presigned`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      byteSize: file.size,
      visibility: 'public',
    }),
  })

  if (!presignedRes.ok) {
    let msg: string | undefined
    try {
      const err = await presignedRes.json()
      msg = err.message ?? err.error
    } catch { /* not JSON */ }
    throw new Error(msg ?? `Upload failed (HTTP ${presignedRes.status})`)
  }

  const { key, uploadUrl, headers: uploadHeaders, publicUrl } = await presignedRes.json()

  // Step 2: PUT file directly to R2 via presigned URL
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: uploadHeaders as Record<string, string>,
    body: file,
  })

  if (!putRes.ok) {
    throw new Error(`Storage upload failed (HTTP ${putRes.status})`)
  }

  return {
    name: file.name,
    url: publicUrl ?? key,
    key,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

/**
 * Upload multiple files via presigned URLs.
 * Returns the same shape as the old FormData upload for drop-in compatibility.
 */
export async function uploadFiles(
  files: File[],
  accessToken: string,
): Promise<{ files: UploadedFile[]; hashes: Record<string, string> }> {
  const uploaded: UploadedFile[] = []
  const hashes: Record<string, string> = {}

  for (const file of files) {
    // Compute browser-side SHA-256 hash for integrity verification
    const hashHex = await computeFileHash(file)
    hashes[file.name] = hashHex

    const result = await uploadFile(file, accessToken)
    uploaded.push(result)
  }

  return { files: uploaded, hashes }
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
