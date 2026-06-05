import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { DashboardLayout } from './DashboardLayout'
import { apiBaseUrl } from '@/lib/api'

type UploadedFile = { name: string; url: string; size: number; type: string }

export function DashboardMedia() {
  const auth = useAuth()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('files', file)
    setUploading(true)
    setError(null)

    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken!}` },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setFiles((prev) => [...(data.files ?? []), ...prev])
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
      setFiles((prev) => prev.filter((f) => f.url !== `/uploads/${key}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [auth.accessToken])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    for (const file of dropped) uploadFile(file)
  }, [uploadFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    for (const file of selected) uploadFile(file)
    if (e.target) e.target.value = ''
  }, [uploadFile])

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Медиа / Media</CardTitle>
          <CardDescription>
            Загружайте изображения для работ и профиля. Поддерживаются JPG, PNG, WebP, SVG.
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
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple onChange={onFileChange} className="hidden" />
              </label>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              JPG, PNG, WebP, SVG · макс. 10 MB
            </p>
          </div>

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
                const key = f.url.replace('/uploads/', '')
                const fullUrl = f.url.startsWith('/uploads/')
                  ? `${apiBaseUrl}${f.url}`
                  : f.url
                return (
                  <div
                    key={f.url}
                    className="relative group rounded-lg overflow-hidden"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                  >
                    <div className="aspect-square">
                      <img
                        src={fullUrl}
                        alt={f.name}
                        className="w-full h-full"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>
                    <div
                      className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.6))' }}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs text-white truncate flex-1 pr-2" title={f.name}>
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteFile(key)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}
                          title="Удалить / Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
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
    </DashboardLayout>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
