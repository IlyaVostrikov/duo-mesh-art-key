import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export function DashboardProfileSettings() {
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [artistId, setArtistId] = useState<string | null>(null)

  const [statement, setStatement] = useState('')
  const [statementEn, setStatementEn] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [location, setLocation] = useState('')
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

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
        setArtistId(artist.id)
        setWebsiteUrl(artist.websiteUrl ?? '')
        setLocation(artist.location ?? '')

        // Parse bilingual statement
        if (artist.artistStatement) {
          const dsep = artist.artistStatement.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
          const didx = artist.artistStatement.indexOf(dsep)
          if (didx !== -1) {
            setStatement(artist.artistStatement.slice(0, didx))
            setStatementEn(artist.artistStatement.slice(didx + dsep.length))
          } else {
            setStatement(artist.artistStatement)
          }
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [auth.accessToken])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!artistId) {
      setError('Нет профиля художника / No artist profile')
      return
    }

    setSaving(true)

    const fullStatement = statementEn.trim()
      ? `${statement.trim()}\n\n---\n\n${statementEn.trim()}`
      : statement.trim()

    try {
      const res = await fetch(`${API_BASE}/api/artists/${artistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify({
          artistStatement: fullStatement || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          location: location.trim() || undefined,
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
          <div className="h-32 w-full bg-[var(--surface)] rounded" />
          <div className="h-10 w-full bg-[var(--surface)] rounded" />
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

  if (error && !artistId) {
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
        <h1 className="text-display-sm mb-8" style={{ fontFamily: 'var(--font-display)' }}>
          Профиль / Settings
        </h1>
      </RevealOnScroll>

      <form onSubmit={handleSave} className="space-y-6" style={{ maxWidth: '640px' }}>
        {/* Artist Statement */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Artist Statement
          </label>
          <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
              <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
            </TabsList>
          </Tabs>
          {lang === 'ru' ? (
            <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={4} placeholder="Я создаю цифровое искусство на стыке..." />
          ) : (
            <Textarea value={statementEn} onChange={(e) => setStatementEn(e.target.value)} rows={4} placeholder="I create digital art at the intersection of..." />
          )}
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Сайт / Website</label>
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            type="url"
            placeholder="https://your-website.com"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Локация / Location</label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Москва, Россия"
          />
        </div>

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
