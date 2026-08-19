import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { apiBaseUrl, ApiRequestError } from '@/lib/api'
import { uploadFile } from '@/lib/upload'

const THEMES: { value: string; label: string }[] = [
  { value: 'default', label: 'Светлый / Light' },
  { value: 'dark', label: 'Тёмный / Dark' },
  { value: 'warm', label: 'Тёплый / Warm' },
  { value: 'cool', label: 'Холодный / Cool' },
]

interface HallData {
  id: string
  artistId: string
  slug: string
  title: string
  description: string | null
  coverImageUrl: string | null
  theme: string | null
  isPublished: boolean
  viewCount: number
}

export function DashboardHallSettings() {
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hall, setHall] = useState<HallData | null>(null)

  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [desc, setDesc] = useState('')
  const [descEn, setDescEn] = useState('')
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [theme, setTheme] = useState('default')
  const [coverFile, setCoverFile] = useState<File | null>(null)

  // Find artist → get hall
  useEffect(() => {
    if (!auth.accessToken) return
    let cancelled = false
    setLoading(true)

    auth.api.requestJson<{
      id: string
      hall: {
        id: string
        slug: string
        title: string
        description: string | null
        coverImageUrl: string | null
        theme: string | null
        isPublished: boolean
        viewCount: number
      } | null
    }>('/api/artists/me')
      .then((artist) => {
        if (cancelled) return
        const h = artist.hall
        if (!h) { setError('NO_HALL'); return }

        setHall({
          id: h.id, artistId: artist.id, slug: h.slug,
          title: h.title, description: h.description ?? null,
          coverImageUrl: h.coverImageUrl ?? null,
          theme: h.theme ?? 'default',
          isPublished: h.isPublished, viewCount: h.viewCount ?? 0,
        })
        setTheme(h.theme ?? 'default')

        // Parse bilingual title
        const sep = h.title.lastIndexOf(' / ')
        if (sep !== -1) {
          setTitle(h.title.slice(0, sep))
          setTitleEn(h.title.slice(sep + 3))
        } else {
          setTitle(h.title)
        }

        // Parse bilingual description
        if (h.description) {
          const dsep = h.description.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
          const didx = h.description.indexOf(dsep)
          if (didx !== -1) {
            setDesc(h.description.slice(0, didx))
            setDescEn(h.description.slice(didx + dsep.length))
          } else {
            setDesc(h.description)
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiRequestError && err.status === 404) setError('NO_PROFILE')
        else setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [auth.accessToken, auth.api])

  const uploadCover = async (file: File): Promise<string | null> => {
    const result = await uploadFile(file, auth.accessToken!)
    return result.url
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!hall) return
    setError(null)
    setSuccess(false)
    setSaving(true)

    const fullTitle = titleEn.trim() ? `${title.trim() || titleEn.trim()} / ${titleEn.trim()}` : title.trim()
    const fullDesc = descEn.trim() ? `${desc.trim()}\n\n---\n\n${descEn.trim()}` : desc.trim()

    try {
      let coverImageUrl = hall.coverImageUrl
      if (coverFile) {
        coverImageUrl = await uploadCover(coverFile)
      }

      const body: Record<string, unknown> = {}
      if (fullTitle) body.title = fullTitle
      if (fullDesc) body.description = fullDesc
      if (coverImageUrl !== undefined) body.coverImageUrl = coverImageUrl
      body.theme = theme
      body.isPublished = hall.isPublished

      await auth.api.requestJson(`/api/halls/${hall.slug}`, {
        method: 'PATCH',
        body,
      })

      // Update local state
      setHall({ ...hall, coverImageUrl, theme })
      setCoverFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-48 bg-[var(--surface)] rounded" />
          <div className="h-10 w-full bg-[var(--surface)] rounded" />
          <div className="h-32 w-full bg-[var(--surface)] rounded" />
        </div>
      </DashboardLayout>
    )
  }

  if (error === 'NO_PROFILE') {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>Сначала создайте профиль художника / Create artist profile first.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error && !hall) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>Ошибка загрузки / Load error: {error}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <RevealOnScroll direction="up">
        <h1 className="text-display-sm mb-8">
          Выставочный зал / Hall
        </h1>
      </RevealOnScroll>

      <form onSubmit={handleSave} className="space-y-6" style={{ maxWidth: '640px' }}>
        {/* Cover image */}
        <FileUpload
          accept=".jpg,.jpeg,.png,.webp"
          maxSize={10 * 1024 * 1024}
          onFileSelect={setCoverFile}
          label="Обложка зала / Hall Cover"
          imagePreview
        />
        {hall?.coverImageUrl && !coverFile && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <img
              src={hall.coverImageUrl.startsWith('/uploads/') ? `${apiBaseUrl}${hall.coverImageUrl}` : hall.coverImageUrl}
              alt="Cover"
              style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Текущая обложка / Current cover</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Название / Title</label>
          <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
              <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
            </TabsList>
          </Tabs>
          {lang === 'ru' ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Мастерская Иванова" />
          ) : (
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Ivanov's Workshop" />
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Описание / Description</label>
          <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
              <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
            </TabsList>
          </Tabs>
          {lang === 'ru' ? (
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Добро пожаловать в мою виртуальную галерею..." />
          ) : (
            <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} placeholder="Welcome to my virtual gallery..." />
          )}
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Тема стен / Wall Theme</label>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="px-4 py-2 text-sm rounded-4xl border transition-colors"
                style={{
                  backgroundColor: theme === t.value ? 'var(--accent)' : 'var(--surface)',
                  color: theme === t.value ? 'var(--accent-ink)' : 'var(--text)',
                  borderColor: theme === t.value ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Publish toggle */}
        {hall && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Опубликовать / Publish</label>
            <button
              type="button"
              onClick={() => setHall({ ...hall, isPublished: !hall.isPublished })}
              className="w-11 h-6 rounded-full relative transition-colors"
              style={{
                backgroundColor: hall.isPublished ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{
                  left: hall.isPublished ? 'calc(100% - 22px)' : '2px',
                }}
              />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {hall.isPublished ? 'Доступен / Visible' : 'Скрыт / Hidden'}
            </span>
          </div>
        )}

        {/* Slug (read-only) */}
        {hall && (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            slug: <code>{hall.slug}</code> · просмотров / views: {hall.viewCount}
          </div>
        )}

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            Сохранено / Saved
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение... / Saving...' : 'Сохранить / Save'}
        </Button>
      </form>
    </DashboardLayout>
  )
}
