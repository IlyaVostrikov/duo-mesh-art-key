import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { FileUpload } from '@/components/ui/file-upload'
import { apiBaseUrl } from '@/lib/api'
import { uploadFiles } from '@/lib/upload'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  LISTED: 'В зале',
  IN_EXHIBITION: 'На выставке',
  SOLD: 'Продано',
  RESERVED: 'Резерв',
  ARCHIVED: 'Архив',
}
const STATUSES = ['DRAFT', 'LISTED', 'IN_EXHIBITION', 'SOLD', 'RESERVED', 'ARCHIVED'] as const

interface Props {
  artworkId: string
  onSaved: () => void
  onCancel: () => void
}

export function EditArtworkForm({ artworkId, onSaved, onCancel }: Props) {
  const auth = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('DIGITAL')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [status, setStatus] = useState('DRAFT')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)

  const handlePosterSelect = (file: File | null) => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(file)
    setPosterPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  useEffect(() => {
    return () => {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    }
  }, [posterPreviewUrl])

  // Load artwork
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${apiBaseUrl}/api/artworks/${artworkId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        // Parse bilingual title: "RU / EN" → extract RU part
        const sep = data.title.indexOf(' / ')
        setTitle(sep > 0 ? data.title.slice(0, sep) : data.title)
        setDescription(data.description ?? '')
        setCategory(data.category ?? 'DIGITAL')
        setPrice(data.price ?? '')
        setCurrency(data.currency ?? 'RUB')
        setStatus(data.status ?? 'DRAFT')
        setPosterUrl(data.posterUrl ?? null)
        setModelUrl(data.modelUrl ?? null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [artworkId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Название обязательно / Title is required')
      return
    }
    setSaving(true)
    try {
      let newPosterUrl = posterUrl
      let newModelUrl = modelUrl

      if (posterFile) {
        const uploadData = await uploadFiles([posterFile], auth.accessToken!)
        newPosterUrl = uploadData.files?.[0]?.url ?? newPosterUrl
      }

      if (modelFile) {
        const uploadData = await uploadFiles([modelFile], auth.accessToken!)
        const modelEntry = uploadData.files?.find((f: { name: string; url: string }) => {
          const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
          return ext === 'glb' || ext === 'gltf'
        })
        if (!modelEntry) {
          throw new Error('No .glb or .gltf model found in the uploaded 3D file.')
        }
        newModelUrl = modelEntry.url
      }

      const res = await fetch(`${apiBaseUrl}/api/artworks/${artworkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken!}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          price: price ? Number(price) : undefined,
          currency,
          status,
          posterUrl: newPosterUrl ?? undefined,
          modelUrl: newModelUrl ?? undefined,
          mediaType: newModelUrl ? 'MODEL_3D' : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      if (msg === 'Failed to fetch' || msg.startsWith('Failed to fetch')) {
        setError('Сервер не отвечает. Проверь, запущен ли бэкенд (bun run dev), не упал ли он при обработке ZIP, и не блокирует ли прокси большие файлы. / Server unreachable — check backend logs, ZIP size, and proxy.')
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 mb-8 flex items-center justify-center gap-2"
        style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <Spinner />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Загрузка... / Loading...</span>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 mb-8 space-y-5"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Редактировать работу / Edit Artwork
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Название (RU) <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название работы" />
      </div>

      {/* Poster / preview image */}
      <div style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        border: posterFile ? '1px solid var(--accent)' : '1px solid var(--border)',
        backgroundColor: posterFile ? 'rgba(var(--accent-rgb), 0.02)' : 'var(--bg)',
      }}>
        <div className="flex gap-4">
          {/* Card preview */}
          {(posterPreviewUrl || posterUrl) && (
            <div
              style={{
                width: '140px',
                flexShrink: 0,
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: '0 0 0 1px var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
                <img
                  src={posterPreviewUrl ?? (posterUrl ? `${apiBaseUrl}${posterUrl}` : '')}
                  alt="Poster preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ padding: '6px 8px' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {posterFile ? 'Новое превью / New preview' : 'Текущее превью / Current'}
                </p>
              </div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Превью / Preview Image
            </span>
            <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>
              Изображение, которое показывается в карточках галереи. Загрузите новое, чтобы заменить.
            </p>
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp,.svg"
              maxSize={10 * 1024 * 1024}
              onFileSelect={handlePosterSelect}
              label={posterFile ? posterFile.name : 'Заменить превью / Replace preview'}
              imagePreview
            />
          </div>
        </div>
      </div>

      {/* 3D model */}
      <div style={{
        padding: '16px',
        borderRadius: 'var(--radius)',
        border: modelFile ? '1px solid var(--accent)' : '1px solid var(--border)',
        backgroundColor: modelFile ? 'rgba(var(--accent-rgb), 0.02)' : 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            3D модель / 3D Model
          </span>
          {modelUrl && !modelFile && (
            <span style={{
              fontSize: '0.65rem', padding: '1px 6px', borderRadius: '99px',
              backgroundColor: 'var(--surface)', color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
              Загружена / Uploaded
            </span>
          )}
          {!modelUrl && !modelFile && (
            <span style={{
              fontSize: '0.65rem', padding: '1px 6px', borderRadius: '99px',
              backgroundColor: 'var(--surface)', color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
              Нет / None
            </span>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Загрузите ZIP-архив с моделью или отдельный .glb/.gltf файл. При добавлении 3D-модели тип работы сменится на MODEL_3D.
        </p>
        <FileUpload
          accept=".zip,.glb,.gltf,.blend,.obj,.fbx,.stl,.usdz"
          maxSize={100 * 1024 * 1024}
          onFileSelect={setModelFile}
          label={modelFile ? `3D модель: ${modelFile.name}` : 'Заменить 3D модель / Replace 3D model'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Описание / Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Описание работы..." />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-4xl border"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Цена</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="15000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Валюта</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-4xl border"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Статус / Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-4xl border"
          style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]} ({s})</option>)}
        </select>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение... / Saving...' : 'Сохранить / Save'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" disabled={saving}>
          Отмена / Cancel
        </Button>
      </div>
    </form>
  )
}
