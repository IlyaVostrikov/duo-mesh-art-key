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

export type UploadPhase = 'preparing' | 'uploading' | 'processing' | 'hashing' | 'complete'

export type UploadProgress = {
  phase: UploadPhase
  fileName: string
  loaded: number
  total: number
  percent: number
  bytesPerSecond: number
  etaSeconds: number | null
}

export type UploadProgressCallback = (progress: UploadProgress) => void

/**
 * Upload a single file via a presigned S3/R2 URL.
 * Uses XHR rather than fetch so the UI can report byte-level progress.
 */
export async function uploadFile(
  file: File,
  accessToken: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadedFile> {
  const report = (progress: Omit<UploadProgress, 'fileName'>) => {
    onProgress?.({ ...progress, fileName: file.name })
  }

  report({ phase: 'preparing', loaded: 0, total: file.size, percent: 0, bytesPerSecond: 0, etaSeconds: null })

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
      msg = err.message ?? err.error?.message ?? err.error
    } catch { /* not JSON */ }
    throw new Error(msg ?? `Upload failed (HTTP ${presignedRes.status})`)
  }

  const { key, uploadUrl, headers: uploadHeaders, publicUrl } = await presignedRes.json()

  // Step 2: PUT file directly to R2 via XHR so large uploads are visible.
  await uploadWithProgress(file, uploadUrl, uploadHeaders as Record<string, string>, report)

  return {
    name: file.name,
    url: publicUrl ?? key,
    key,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

/**
 * Upload a GLB/GLTF file or a ZIP bundle containing a glTF scene and its
 * relative .bin/textures. ZIPs are finalized server-side and return the
 * extracted scene.gltf URL that model-viewer can load.
 */
export async function uploadModelFile(
  file: File,
  accessToken: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'gltf') {
    throw new Error('GLTF с .bin/текстурами нужно загрузить ZIP-набором: добавьте scene.gltf, scene.bin и папку textures в один ZIP')
  }

  const uploaded = await uploadFile(file, accessToken, onProgress)
  if (!file.name.toLowerCase().endsWith('.zip')) return uploaded

  onProgress?.({
    phase: 'processing',
    fileName: file.name,
    loaded: file.size,
    total: file.size,
    percent: 100,
    bytesPerSecond: 0,
    etaSeconds: null,
  })

  const finalizeRes = await fetch(`${apiBaseUrl}/api/uploads/finalize-model`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: uploaded.key }),
  })

  if (!finalizeRes.ok) {
    let msg: string | undefined
    try {
      const err = await finalizeRes.json()
      msg = err.message ?? err.error?.message ?? err.error
    } catch { /* not JSON */ }
    throw new Error(msg ?? `Model bundle processing failed (HTTP ${finalizeRes.status})`)
  }

  const finalized = await finalizeRes.json() as {
    modelUrl?: string
    modelKey?: string
    modelName?: string
    modelType?: string
  }
  if (!finalized.modelUrl) {
    throw new Error('В ZIP не найден .gltf или .glb / ZIP does not contain a .gltf or .glb scene')
  }

  onProgress?.({
    phase: 'complete',
    fileName: file.name,
    loaded: file.size,
    total: file.size,
    percent: 100,
    bytesPerSecond: 0,
    etaSeconds: null,
  })

  return {
    ...uploaded,
    name: finalized.modelName ?? file.name,
    url: finalized.modelUrl,
    key: finalized.modelKey ?? uploaded.key,
    type: finalized.modelType ?? 'model/gltf+json',
  }
}

async function uploadWithProgress(
  file: File,
  uploadUrl: string,
  headers: Record<string, string>,
  report: (progress: Omit<UploadProgress, 'fileName'>) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startedAt = performance.now()

    xhr.open('PUT', uploadUrl)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)

    const updateProgress = (loaded: number, phase: UploadPhase = 'uploading') => {
      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001)
      const bytesPerSecond = loaded / elapsedSeconds
      const remainingBytes = Math.max(file.size - loaded, 0)
      report({
        phase,
        loaded,
        total: file.size,
        percent: file.size > 0 ? Math.min(100, Math.round((loaded / file.size) * 100)) : 100,
        bytesPerSecond,
        etaSeconds: bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null,
      })
    }

    xhr.upload.addEventListener('progress', (event) => {
      updateProgress(event.lengthComputable ? event.loaded : 0)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateProgress(file.size, 'complete')
        resolve()
      } else {
        reject(new Error(`Storage upload failed (HTTP ${xhr.status})`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Storage upload failed: network error')))
    xhr.addEventListener('abort', () => reject(new Error('Storage upload cancelled')))
    xhr.send(file)
    updateProgress(0)
  })
}

/**
 * Upload multiple files via presigned URLs.
 * Returns the same shape as the old FormData upload for drop-in compatibility.
 */
export async function uploadFiles(
  files: File[],
  accessToken: string,
  onProgress?: UploadProgressCallback,
  options?: { finalizeModels?: boolean },
): Promise<{ files: UploadedFile[]; hashes: Record<string, string> }> {
  const uploaded: UploadedFile[] = []
  const hashes: Record<string, string> = {}

  for (const file of files) {
    // Upload first so large files start moving immediately. Hashing a 200 MB
    // File via arrayBuffer() can otherwise look like a frozen upload.
    const lowerName = file.name.toLowerCase()
    const result = options?.finalizeModels && (lowerName.endsWith('.zip') || lowerName.endsWith('.gltf'))
      ? await uploadModelFile(file, accessToken, onProgress)
      : await uploadFile(file, accessToken, onProgress)

    onProgress?.({
      phase: 'hashing',
      fileName: file.name,
      loaded: file.size,
      total: file.size,
      percent: 100,
      bytesPerSecond: 0,
      etaSeconds: null,
    })
    hashes[file.name] = await computeFileHash(file)
    onProgress?.({
      phase: 'complete',
      fileName: file.name,
      loaded: file.size,
      total: file.size,
      percent: 100,
      bytesPerSecond: 0,
      etaSeconds: null,
    })
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