import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { assetUrl } from '@/lib/asset-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from './DashboardLayout'
import { FileUpload } from '@/components/ui/file-upload'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

interface ArtworkItem {
  id: string
  title: string
  posterUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  price: string | null
  currency: string
  status: string
  category: string
}

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'
const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

export function DashboardArtworks() {
  const auth = useAuth()
  const [artworks, setArtworks] = useState<ArtworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [category, setCategory] = useState('DIGITAL')
  const [mediaType, setMediaType] = useState<'IMAGE_2D' | 'MODEL_3D'>('IMAGE_2D')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [modelUrl, setModelUrl] = useState('')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchMyWorks = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/artworks?my=true&pageSize=50`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken])

  useEffect(() => { fetchMyWorks() }, [fetchMyWorks])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!title.trim() && !titleEn.trim()) {
      setFormError('Название обязательно / Title is required')
      return
    }

    const fullTitle = titleEn.trim() ? `${title.trim() || titleEn.trim()} / ${titleEn.trim()}` : title.trim()
    const fullDesc = descriptionEn.trim()
      ? `${description.trim()}\n\n---\n\n${descriptionEn.trim()}`
      : description.trim()

    setSubmitting(true)
    try {
      let posterUrl = 'seed/placeholder-poster.svg'
      let finalModelUrl = modelUrl || undefined

      // Phase 1: Upload files if any
      if (posterFile || modelFile) {
        setUploadingFiles(true)
        const formData = new FormData()
        if (posterFile) formData.append('files', posterFile)
        if (modelFile) formData.append('files', modelFile)

        const uploadRes = await fetch(`${API_BASE}/api/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.accessToken!}` },
          body: formData,
        })
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}))
          throw new Error(err.message ?? err.error?.message ?? 'Upload failed')
        }
        const uploadData = await uploadRes.json()
        for (const f of uploadData.files) {
          const ext = f.name.split('.').pop()?.toLowerCase()
          if (['glb', 'gltf', 'blend', 'obj', 'fbx', 'stl', 'usdz'].includes(ext ?? '')) {
            finalModelUrl = f.url
          } else {
            posterUrl = f.url
          }
        }
        setUploadingFiles(false)
      }

      // Phase 2: Create artwork
      const body: Record<string, unknown> = {
        title: fullTitle,
        description: fullDesc || undefined,
        category,
        mediaType,
        posterUrl,
        price: price ? Number(price) : undefined,
        currency,
      }
      if (mediaType === 'MODEL_3D' && finalModelUrl) body.modelUrl = finalModelUrl

      const res = await fetch(`${API_BASE}/api/artworks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      // Reset form and refresh
      setTitle(''); setTitleEn(''); setDescription(''); setDescriptionEn('')
      setPrice(''); setModelUrl(''); setPosterFile(null); setModelFile(null)
      setFormError(null)
      setShowForm(false)
      fetchMyWorks()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
      setUploadingFiles(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить работу? / Delete artwork?')) return
    setDeleting(id)
    try {
      const res = await fetch(`${API_BASE}/api/artworks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken!}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setArtworks((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-sm" style={{ fontFamily: 'var(--font-display)' }}>
            Мои работы / My Artworks
          </h1>
        </RevealOnScroll>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? 'Отмена / Cancel' : '+ Новая работа / New Artwork'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-6 mb-8 space-y-4"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Название (RU)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Цифровой пейзаж" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Title (EN)</label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Digital Landscape" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Описание (RU)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Описание работы..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Description (EN)</label>
              <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} placeholder="Artwork description..." />
            </div>
          </div>

          {/* Poster image upload */}
          <FileUpload
            accept=".jpg,.jpeg,.png,.webp,.svg"
            maxSize={10 * 1024 * 1024}
            onFileSelect={setPosterFile}
            label="Обложка / Poster Image"
            imagePreview
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Тип / Media</label>
              <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as 'IMAGE_2D' | 'MODEL_3D')}>
                <TabsList className="h-8">
                  <TabsTrigger value="IMAGE_2D" className="text-xs px-3">2D</TabsTrigger>
                  <TabsTrigger value="MODEL_3D" className="text-xs px-3">3D</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-4xl border"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
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
              <Tabs value={currency} onValueChange={(v) => setCurrency(v)}>
                <TabsList className="h-8">
                  <TabsTrigger value="RUB" className="text-xs px-3">₽ RUB</TabsTrigger>
                  <TabsTrigger value="USD" className="text-xs px-3">$ USD</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {mediaType === 'MODEL_3D' && (
            <>
              <FileUpload
                accept=".glb,.gltf,.blend,.obj,.fbx,.stl,.usdz"
                maxSize={100 * 1024 * 1024}
                onFileSelect={setModelFile}
                label="3D Модель / 3D Model"
              />
              {!modelFile && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Или укажите URL / Or paste URL</label>
                  <Input value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="https://example.com/model.glb" />
                </div>
              )}
            </>
          )}

          {formError && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {uploadingFiles ? 'Загрузка файлов... / Uploading...' : submitting ? 'Создание... / Creating...' : 'Создать / Create'}
          </Button>
        </form>
      )}

      {/* Works list */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ aspectRatio: '4/5', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Ошибка загрузки / Load error</p>
          <Button onClick={fetchMyWorks} size="sm">Повторить / Retry</Button>
        </div>
      )}

      {!loading && !error && artworks.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 py-16"
          style={{ color: 'var(--text-muted)' }}
        >
          <p>У вас пока нет работ / No artworks yet.</p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">+ Создать первую / Create First</Button>
          )}
        </div>
      )}

      {!loading && !error && artworks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artworks.map((aw, i) => (
            <RevealOnScroll key={aw.id} direction="up" delay={i * 50}>
            <div
              className="group relative"
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}
            >
              <Link to="/artwork/$artworkId" params={{ artworkId: aw.id }} style={{ textDecoration: 'none' }}>
                <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
                  <img
                    src={assetUrl(aw.posterUrl ?? '')}
                    alt={aw.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {aw.title.split(' / ')[0]}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {aw.category} · {aw.status === 'DRAFT' ? 'Черновик / Draft' : aw.status}
                    {aw.price && ` · ${aw.currency === 'RUB' ? `${Number(aw.price).toLocaleString('ru-RU')} ₽` : `$${Number(aw.price).toLocaleString('en-US')}`}`}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(aw.id)}
                disabled={deleting === aw.id}
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
                title="Удалить / Delete"
              >
                {deleting === aw.id ? '...' : '×'}
              </button>
            </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
