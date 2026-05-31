import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import { apiBaseUrl } from '@/lib/api'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

export function CreateArtworkForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const auth = useAuth()

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
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
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

      if (posterFile || modelFile) {
        setUploadingFiles(true)
        const formData = new FormData()
        if (posterFile) formData.append('files', posterFile)
        if (modelFile) formData.append('files', modelFile)

        const uploadRes = await fetch(`${apiBaseUrl}/api/uploads`, {
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

      const res = await fetch(`${apiBaseUrl}/api/artworks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      onCreated()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
      setUploadingFiles(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button type="submit" disabled={submitting}>
          {uploadingFiles ? 'Загрузка файлов... / Uploading...' : submitting ? 'Создание... / Creating...' : 'Создать / Create'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" size="sm" disabled={submitting}>
          Отмена / Cancel
        </Button>
      </div>
    </form>
  )
}
