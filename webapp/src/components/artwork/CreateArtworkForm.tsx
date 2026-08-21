import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/ui/file-upload'
import { apiBaseUrl } from '@/lib/api'
import { uploadFiles } from '@/lib/upload'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

interface CreatedArtwork {
  id: string
  title: string
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
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)

  const handlePosterSelect = (file: File | null) => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(file)
    setPosterPreviewUrl(file ? URL.createObjectURL(file) : null)
  }
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

  useEffect(() => {
    return () => {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    }
  }, [posterPreviewUrl])

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
          throw new Error('Не найден файл .glb или .gltf. Выберите файл glTF-модели напрямую.')
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
      const msg = err instanceof Error ? err.message : 'Create failed'
      if (msg === 'Failed to fetch' || msg.startsWith('Failed to fetch')) {
        setFormError('Сервер не отвечает. Проверь, запущен ли бэкенд (bun run dev), не упал ли он при обработке ZIP, и не блокирует ли прокси большие файлы. / Server unreachable — check backend logs, ZIP size, and proxy.')
      } else {
        setFormError(msg)
      }
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
        <Button onClick={() => { setDone(null); setTitle(''); setTitleEn(''); setPosterFile(null); setPosterPreviewUrl(null); setModelFile(null); setDescription(''); setDescriptionEn(''); setPrice('') }}>
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
      {/* ── 3D model upload (optional) — GLB or GLTF ── */}
      <FileUpload
        accept=".glb,.gltf"
        maxSize={100 * 1024 * 1024}
        onFileSelect={setModelFile}
        label={modelFile ? `3D модель: ${modelFile.name}` : '3D модель (опционально) — .glb или .gltf'}
      />

      {/* ── Poster / preview render — always visible.
           For 2D: the uploaded image IS the artwork (no separate preview).
           For 3D: a preview render so gallery cards donʼt load heavy 3D models.
           When preselected from Media Library the file is already uploaded. ── */}

      {/* Card preview — shows how the artwork will look in the gallery */}
      {(posterPreviewUrl || preselectedPosterUrl) && (
        <div className="flex gap-4">
          {/* Mini gallery card */}
          <div
            style={{
              width: '160px',
              flexShrink: 0,
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              boxShadow: '0 0 0 1px var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
              <img
                src={posterPreviewUrl ?? (preselectedPosterUrl?.startsWith('http') ? preselectedPosterUrl : `${apiBaseUrl}${preselectedPosterUrl}`)}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ padding: '8px 10px' }}>
              <p
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}
              >
                {title.trim() || titleEn.trim() || 'Название / Title'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                {has3D ? '3D · ' : ''}Gallery card preview
              </p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Так работа будет выглядеть в галерее / Gallery card appearance
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Это изображение показывается в карточках галереи, каталоге и поиске.
              Без превью 3D-модели не будут загружаться в общем списке — только картинка.
            </p>
          </div>
        </div>
      )}

      {preselectedPosterUrl ? (
        /* Already uploaded via Media Library — show reference */
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={preselectedPosterUrl?.startsWith('http') ? preselectedPosterUrl : `${apiBaseUrl}${preselectedPosterUrl}`}
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
      ) : (
        /* Unified poster upload — label adapts to 2D vs 3D */
        <div style={{
          padding: '16px',
          borderRadius: 'var(--radius)',
          border: posterFile
            ? '1px solid var(--accent)'
            : has3D
              ? '2px dashed var(--accent)'
              : '2px dashed var(--border)',
          backgroundColor: posterFile
            ? 'var(--surface)'
            : has3D
              ? 'rgba(var(--accent-rgb), 0.03)'
              : 'var(--bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: has3D ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {posterFile
                ? 'Превью загружено / Preview ready'
                : has3D
                  ? 'Превью для галереи / Gallery Preview'
                  : 'Изображение работы / Artwork Image'}
            </span>
            {has3D && !posterFile && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px',
                backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
              }}>
                Нужно / Required
              </span>
            )}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {has3D
              ? 'Загрузите превью-рендер. Он будет показываться в галерее вместо загрузки тяжёлой 3D-модели.'
              : 'Загрузите изображение. Для 2D-работ это и есть сама работа.'}
          </p>
          <FileUpload
            accept=".jpg,.jpeg,.png,.webp,.svg"
            maxSize={10 * 1024 * 1024}
            onFileSelect={handlePosterSelect}
            label={posterFile ? posterFile.name : (has3D ? 'Выбрать превью / Choose preview' : 'Выбрать изображение / Choose image')}
            imagePreview
          />
        </div>
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
