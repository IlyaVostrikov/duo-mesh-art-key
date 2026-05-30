import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

function joinBilingual(ru: string, en: string): string {
  if (!en.trim()) return ru.trim()
  if (!ru.trim()) return en.trim()
  return `${ru.trim()}\n\n---\n\n${en.trim()}`
}

function joinBilingualTitle(ru: string, en: string): string {
  if (!en.trim()) return ru.trim()
  if (!ru.trim()) return en.trim()
  return `${ru.trim()} / ${en.trim()}`
}

export function ArtistOnboarding() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bilingual form state
  const [titleRu, setTitleRu] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [statementRu, setStatementRu] = useState('')
  const [statementEn, setStatementEn] = useState('')
  const [hallDescRu, setHallDescRu] = useState('')
  const [hallDescEn, setHallDescEn] = useState('')
  const [location, setLocation] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  if (!auth.user) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Стать художником / Become an Artist</CardTitle>
            <CardDescription>
              Войдите или создайте аккаунт, чтобы продолжить.
              <br />
              Log in or create an account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/app"
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium rounded-4xl bg-[var(--accent)] text-[var(--accent-ink)] no-underline"
            >
              Войти / Log in
            </a>
          </CardContent>
        </Card>
      </section>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const hallTitle = joinBilingualTitle(titleRu, titleEn)
    if (hallTitle.length < 2) {
      setError(lang === 'ru'
        ? 'Название зала обязательно (минимум 2 символа)'
        : 'Hall title is required (min 2 characters)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({
          hallTitle,
          hallDescription: joinBilingual(hallDescRu, hallDescEn) || undefined,
          artistStatement: joinBilingual(statementRu, statementEn) || undefined,
          location: location.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setError(lang === 'ru'
            ? 'У вас уже есть профиль художника.'
            : 'You already have an artist profile.')
          return
        }
        setError(data.message ?? `HTTP ${res.status}`)
        return
      }

      const artist = await res.json()
      navigate({ to: '/hall/$hallSlug', params: { hallSlug: artist.hall.slug } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const t = {
    title: lang === 'ru' ? 'Стать художником' : 'Become an Artist',
    subtitle: lang === 'ru'
      ? 'Заполните профиль, чтобы получить выставочный зал и начать публиковать работы.'
      : 'Fill out your profile to get an exhibition hall and start publishing artworks.',
    hallTitle: lang === 'ru' ? 'Название зала' : 'Hall Title',
    hallTitleHint: lang === 'ru' ? 'Будет отображаться на двух языках' : 'Will be displayed in both languages',
    hallDesc: lang === 'ru' ? 'Описание зала' : 'Hall Description',
    statement: lang === 'ru' ? 'Artist Statement' : 'Artist Statement',
    statementHint: lang === 'ru'
      ? 'Расскажите о своей художественной практике, методах и философии.'
      : 'Tell about your artistic practice, methods, and philosophy.',
    location: lang === 'ru' ? 'Город / Страна' : 'City / Country',
    website: lang === 'ru' ? 'Сайт (опционально)' : 'Website (optional)',
    submit: lang === 'ru' ? 'Создать профиль художника' : 'Create Artist Profile',
    submitting: lang === 'ru' ? 'Создание...' : 'Creating...',
    preview: lang === 'ru' ? 'Предпросмотр' : 'Preview',
    previewDesc: lang === 'ru'
      ? 'Так ваш зал будет выглядеть в галерее.'
      : 'This is how your hall will appear in the gallery.',
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription className="mt-2">{t.subtitle}</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="text-xs font-medium px-3 py-1 rounded-full border"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border)',
                cursor: 'pointer',
              }}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hall Title — bilingual */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {t.hallTitle} <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
                <TabsList className="h-8">
                  <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
                  <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
                </TabsList>
                <TabsContent value="ru" forceMount hidden={lang !== 'ru'}>
                  <Input
                    value={titleRu}
                    onChange={(e) => setTitleRu(e.target.value)}
                    placeholder="Мастерская Иванова"
                  />
                </TabsContent>
                <TabsContent value="en" forceMount hidden={lang !== 'en'}>
                  <Input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Ivanov's Workshop"
                  />
                </TabsContent>
              </Tabs>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t.hallTitleHint}: {joinBilingualTitle(titleRu, titleEn) || '(пусто / empty)'}
              </p>
            </div>

            {/* Artist Statement — bilingual textarea */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {t.statement}
              </label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{t.statementHint}</p>
              <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
                <TabsList className="h-8">
                  <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
                  <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
                </TabsList>
                <TabsContent value="ru" forceMount hidden={lang !== 'ru'}>
                  <Textarea
                    value={statementRu}
                    onChange={(e) => setStatementRu(e.target.value)}
                    placeholder="Я работаю с цифровой скульптурой..."
                    rows={4}
                  />
                </TabsContent>
                <TabsContent value="en" forceMount hidden={lang !== 'en'}>
                  <Textarea
                    value={statementEn}
                    onChange={(e) => setStatementEn(e.target.value)}
                    placeholder="I work with digital sculpture..."
                    rows={4}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Hall Description — bilingual textarea */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {t.hallDesc}
              </label>
              <Tabs value={lang} onValueChange={(v) => setLang(v as 'ru' | 'en')} className="mb-3">
                <TabsList className="h-8">
                  <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
                  <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
                </TabsList>
                <TabsContent value="ru" forceMount hidden={lang !== 'ru'}>
                  <Textarea
                    value={hallDescRu}
                    onChange={(e) => setHallDescRu(e.target.value)}
                    placeholder="Добро пожаловать в мою виртуальную галерею..."
                    rows={3}
                  />
                </TabsContent>
                <TabsContent value="en" forceMount hidden={lang !== 'en'}>
                  <Textarea
                    value={hallDescEn}
                    onChange={(e) => setHallDescEn(e.target.value)}
                    placeholder="Welcome to my virtual gallery..."
                    rows={3}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Location + Website — single-language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  {t.location}
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Москва, Россия"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  {t.website}
                </label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
            </div>

            {/* Preview */}
            <div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.preview}
              </p>
              <p className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {joinBilingualTitle(titleRu, titleEn) || (lang === 'ru' ? 'Без названия' : 'Untitled')}
              </p>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {auth.user?.displayName ?? auth.user?.email}
              </p>
              {(statementRu || statementEn) ? (
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '480px', borderLeft: '2px solid var(--accent)', paddingLeft: '12px' }}>
                  {lang === 'ru'
                    ? (statementRu || statementEn).slice(0, 150) + ((statementRu || statementEn).length > 150 ? '...' : '')
                    : (statementEn || statementRu).slice(0, 150) + ((statementEn || statementRu).length > 150 ? '...' : '')}
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t.previewDesc}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t.submitting : t.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
