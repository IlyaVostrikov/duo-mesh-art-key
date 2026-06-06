import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/ui/file-upload'
import { apiBaseUrl } from '@/lib/api'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

interface CreatedArtwork {
  id: string
  title: string
}

async function uploadFiles(files: File[], accessToken: string): Promise<{ files: Array<{ name: string; url: string; size: number; type: string }>; hashes: Record<string, string> }> {
  const formData = new FormData()
  for (const f of files) formData.append('files', f)

  const res = await fetch(`${apiBaseUrl}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Upload failed')
  }
  return res.json()
}

export function CreateArtworkForm({
  onCreated,
  onCancel,
  preselectedPosterUrl,
  preselectedPosterName,
}: {
  onCreated: (artwork?: CreatedArtwork) => void
  onCancel: () => void
  preselectedPosterUrl?: string
  preselectedPosterName?: string
}) {
  const auth = useAuth()

  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState<CreatedArtwork | null>(null)

  // Optional advanced fields — hidden by default
  const [showMore, setShowMore] = useState(false)
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [category, setCategory] = useState('DIGITAL')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [status, setStatus] = useState<'LISTED' | 'DRAFT'>('LISTED')

  const has3D = modelFile !== null

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
      let posterUrl = preselectedPosterUrl ?? 'seed/placeholder-poster.svg'
      let modelUrl: string | undefined
      const fileHashes: Record<string, string> = {}

      // Upload poster (skip if preselected from Media library)
      if (posterFile) {
        const uploadData = await uploadFiles([posterFile], auth.accessToken!)
        posterUrl = uploadData.files?.[0]?.url ?? posterUrl
        Object.assign(fileHashes, uploadData.hashes)

        // Also compute browser-side hash
        const fileBuffer = await posterFile.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
        const hashHex = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        fileHashes[posterFile.name] = hashHex
      }

      // Upload 3D model (zip or individual file)
      if (modelFile) {
        const uploadData = await uploadFiles([modelFile], auth.accessToken!)
        Object.assign(fileHashes, uploadData.hashes)

        // Find the main 3D model file (.glb or .gltf) from the upload response
        const modelEntry = uploadData.files?.find((f: { name: string; url: string }) => {
          const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
          return ext === 'glb' || ext === 'gltf'
        })
        modelUrl = modelEntry?.url

        if (!modelUrl) {
          throw new Error('No .glb or .gltf model found in the uploaded 3D file. For zip files, ensure a glTF model is included.')
        }
      }

      const mediaType = has3D ? 'MODEL_3D' : 'IMAGE_2D'

      const body: Record<string, unknown> = {
        title: fullTitle,
        description: fullDesc || undefined,
        category,
        mediaType,
        posterUrl,
        modelUrl,
        status,
        price: price ? Number(price) : undefined,
        currency,
        fileHashes,
      }

      const res = await fetch(`${apiBaseUrl}/api/artworks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      const created = await res.json()
      setDone(created)
      onCreated(created)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Done state: artwork created ───
  if (done) {
    return (
      <div
        className="p-8 mb-8 text-center space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
      >
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-lg font-semibold font-display">
          {status === 'LISTED' ? 'Работа в зале! / In your hall!' : 'Сохранено в черновики / Saved as draft'}
        </p>
        <Button onClick={() => { setDone(null); setTitle(''); setTitleEn(''); setPosterFile(null); setModelFile(null); setDescription(''); setDescriptionEn(''); setPrice('') }}>
          + Ещё работу / Add another
        </Button>
      </div>
    )
  }

  // ─── Form ───
  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 mb-8 space-y-5"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
    >
      {/* ── 3D model upload (optional) — zip or individual 3D file ── */}
      <FileUpload
        accept=".zip,.glb,.gltf,.blend,.obj,.fbx,.stl,.usdz"
        maxSize={100 * 1024 * 1024}
        onFileSelect={setModelFile}
        label={modelFile ? `3D модель: ${modelFile.name}` : '3D модель (опционально) — ZIP или .glb/.gltf'}
      />

      {/* ── Poster / preview render ──
           For 2D: shown as main image upload above title.
           For 3D: shown as dedicated preview render section below 3D upload. ── */}
      {preselectedPosterUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={`${apiBaseUrl}${preselectedPosterUrl}`}
            alt={preselectedPosterName ?? 'Preselected poster'}
            style={{
              width: '80px', height: '80px', objectFit: 'cover',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Из Media-библиотеки / From Media</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{preselectedPosterName ?? 'Загруженный файл'}</p>
          </div>
        </div>
      ) : has3D ? (
        /* ── 3D preview render — dedicated block ── */
        <div style={{
          padding: '16px',
          borderRadius: 'var(--radius)',
          border: posterFile ? '1px solid var(--accent)' : '2px dashed var(--accent)',
          backgroundColor: posterFile ? 'var(--surface)' : 'rgba(var(--accent-rgb), 0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--accent)', flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {posterFile ? 'Превью-рендер загружен / Preview ready' : 'Превью-рендер для галереи / Gallery Preview Render'}
            </span>
            {!posterFile && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px',
                backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
              }}>
                Рекомендуется / Recommended
              </span>
            )}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Это изображение будет показываться в карточках галереи, каталоге и поиске. Без него — силуэт-заглушка.
          </p>
          <FileUpload
            accept=".jpg,.jpeg,.png,.webp,.svg"
            maxSize={10 * 1024 * 1024}
            onFileSelect={setPosterFile}
            label={posterFile ? posterFile.name : 'Выбрать превью-рендер / Choose preview render'}
            imagePreview
          />
        </div>
      ) : (
        /* ── 2D image upload — main content ── */
        <FileUpload
          accept=".jpg,.jpeg,.png,.webp,.svg"
          maxSize={10 * 1024 * 1024}
          onFileSelect={setPosterFile}
          label={posterFile ? 'Изображение выбрано / Image selected' : 'Загрузите изображение / Upload artwork image'}
          imagePreview
        />
      )}

      {/* ── Title — the only required text ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Название (RU) <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Цифровой пейзаж" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Title (EN)</label>
          <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Digital Landscape" />
        </div>
      </div>

      {/* ── Status toggle — LISTED (in hall) or DRAFT ── */}
      <div className="flex items-center gap-4">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Статус / Status:</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: status === 'LISTED' ? 'var(--accent)' : 'var(--text-muted)' }}>
          <input
            type="radio"
            name="status"
            checked={status === 'LISTED'}
            onChange={() => setStatus('LISTED')}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          В зале / In Hall
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: status === 'DRAFT' ? 'var(--accent)' : 'var(--text-muted)' }}>
          <input
            type="radio"
            name="status"
            checked={status === 'DRAFT'}
            onChange={() => setStatus('DRAFT')}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          Черновик / Draft
        </label>
      </div>

      {/* ── More options toggle ── */}
      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="text-sm font-medium flex items-center gap-1"
        style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: showMore ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {showMore ? 'Скрыть детали / Hide details' : 'Детали / Details (категория, цена, описание)'}
      </button>

      {showMore && (
        <div className="space-y-4 pt-2 pl-1" style={{ borderLeft: '2px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Описание (RU)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Описание работы..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Description (EN)</label>
              <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={2} placeholder="Artwork description..." />
            </div>
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
        </div>
      )}

      {formError && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          {formError}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? 'Создание... / Creating...' : status === 'LISTED' ? 'Опубликовать в зал / Publish to Hall' : 'Сохранить черновик / Save Draft'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" disabled={submitting}>
          Отмена / Cancel
        </Button>
      </div>
    </form>
  )
}
