import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

interface HallData {
  id: string
  artistId: string
  slug: string
  title: string
  description: string | null
  coverImageUrl: string | null
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

  // Find artist → get hall
  useEffect(() => {
    if (!auth.accessToken) return
    let cancelled = false
    setLoading(true)

    fetch(`${API_BASE}/api/artists/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'NO_PROFILE' : `HTTP ${r.status}`)
        return r.json()
      })
      .then((artist) => {
        if (cancelled) return
        const h = artist.hall
        if (!h) { setError('NO_HALL'); return }

        setHall({ id: h.id, artistId: artist.id, slug: h.slug, title: h.title, description: h.description ?? null, coverImageUrl: h.coverImageUrl ?? null, isPublished: h.isPublished, viewCount: h.viewCount ?? 0 })

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
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [auth.accessToken])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!hall) return
    setError(null)
    setSuccess(false)
    setSaving(true)

    const fullTitle = titleEn.trim() ? `${title.trim() || titleEn.trim()} / ${titleEn.trim()}` : title.trim()
    const fullDesc = descEn.trim() ? `${desc.trim()}\n\n---\n\n${descEn.trim()}` : desc.trim()

    try {
      const res = await fetch(`${API_BASE}/api/halls/${hall.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify({
          title: fullTitle || undefined,
          description: fullDesc || undefined,
          isPublished: hall.isPublished,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
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
      <h1 className="text-display-sm mb-8" style={{ fontFamily: 'var(--font-display)' }}>
        Выставочный зал / Hall
      </h1>

      <form onSubmit={handleSave} className="space-y-6" style={{ maxWidth: '640px' }}>
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
