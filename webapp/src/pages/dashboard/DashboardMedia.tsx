import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { DashboardLayout } from './DashboardLayout'
import { CreateArtworkForm } from '@/components/artwork/CreateArtworkForm'
import { apiBaseUrl } from '@/lib/api'
import { uploadFile, uploadModelFile, type UploadedFile, type UploadProgress } from '@/lib/upload'
import { UploadProgressView } from '@/components/ui/upload-progress'

const ACCEPT_3D = '.glb,.blend,.obj,.fbx,.stl,.usdz'
const ACCEPT_ZIP = '.zip'
const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp,.svg'
const ALL_ACCEPT = [ACCEPT_IMAGE, ACCEPT_ZIP, ACCEPT_3D].join(',')

const MODEL_EXTENSIONS = new Set(['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'])

export function DashboardMedia() {
  const auth = useAuth()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Artwork creation from uploaded file
  const [creatingFrom, setCreatingFrom] = useState<UploadedFile | null>(null)

  const doUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    setUploadProgress(null)

    try {
      const result = file.name.toLowerCase().endsWith('.zip')
        ? await uploadModelFile(file, auth.accessToken!, setUploadProgress)
        : await uploadFile(file, auth.accessToken!, setUploadProgress)
      setFiles((prev) => [result, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [auth.accessToken])

  const deleteFile = useCallback(async (key: string) => {
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken!}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFiles((prev) => prev.filter((f) => f.key !== key))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [auth.accessToken])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    for (const file of dropped) doUpload(file)
  }, [doUpload])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    for (const file of selected) doUpload(file)
    if (e.target) e.target.value = ''
  }, [doUpload])

  const handleArtworkCreated = useCallback(() => {
    setCreatingFrom(null)
  }, [])

  return (
    <DashboardLayout>
      {/* Inline artwork creation form */}
      {creatingFrom && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <button
              onClick={() => setCreatingFrom(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Назад к файлам / Back to files
            </button>
          </div>
          <CreateArtworkForm
            onCreated={handleArtworkCreated}
            onCancel={() => setCreatingFrom(null)}
            preselectedPosterUrl={creatingFrom.url}
            preselectedPosterName={creatingFrom.name}
          />
        </div>
      )}

      {!creatingFrom && (
        <Card>
          <CardHeader>
            <CardTitle>Медиа / Media</CardTitle>
            <CardDescription>
              Загружайте изображения и 3D-модели для работ. После загрузки нажмите «Создать работу» на файле.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-colors mb-6"
              style={{
                borderRadius: 'var(--radius)',
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: dragOver ? 'rgba(var(--accent-rgb), 0.04)' : 'var(--bg)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: 'var(--text-muted)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Перетащите файлы или{' '}
                <label style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                  выберите на компьютере
                  <input type="file" accept={ALL_ACCEPT} multiple onChange={onFileChange} className="hidden" />
                </label>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                JPG, PNG, WebP, SVG, GLB, BLEND, OBJ, FBX, STL, ZIP · ZIP-бандлы 3D собираются автоматически · макс. 200 MB
              </p>
            </div>

            <UploadProgressView progress={uploadProgress} />

            {uploading && (
              <div className="flex items-center gap-2 mb-4">
                <Spinner /> <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Загрузка... / Uploading...</span>
              </div>
            )}

            {error && (
              <p className="text-sm px-4 py-3 rounded-lg mb-4" style={{
                backgroundColor: 'var(--surface)', color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}>
                {error}
              </p>
            )}

            {/* File grid */}
            {files.length === 0 && !uploading ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                Нет загруженных файлов. Перетащите изображения в зону выше.
              </p>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {files.map((f) => {
                  const fullUrl = f.url
                  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
                  const isImage = f.type.startsWith('image/') && !MODEL_EXTENSIONS.has(ext)
                  return (
                    <div
                      key={f.url}
                      className="relative group rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                    >
                      <div className="aspect-square">
                        {isImage ? (
                          <img
                            src={fullUrl}
                            alt={f.name}
                            className="w-full h-full"
                            style={{ objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundColor: 'var(--bg)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                              style={{ color: 'var(--accent)' }}>
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M2 17l10 5 10-5" />
                              <path d="M2 12l10 5 10-5" />
                            </svg>
                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>.{ext}</span>
                          </div>
                        )}
                      </div>

                      {/* Hover overlay with actions */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.65)' }}
                      >
                        {/* Create artwork button — primary action */}
                        {isImage && (
                          <button
                            type="button"
                            onClick={() => setCreatingFrom(f)}
                            style={{
                              padding: '6px 16px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--accent)',
                              color: 'var(--accent-ink)',
                              border: 'none',
                              borderRadius: 'var(--radius)',
                              cursor: 'pointer',
                            }}
                          >
                            + Создать работу / Create artwork
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteFile(f.key)}
                          className="shrink-0 px-3 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Удалить / Delete"
                        >
                          Удалить / Delete
                        </button>
                      </div>

                      {/* File info footer */}
                      <div className="p-2">
                        <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{f.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatSize(f.size)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
