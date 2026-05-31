import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { joinBilingualTitle } from '@/lib/utils'
import { BilingualField } from '@/components/BilingualField'
import { useArtistOnboarding } from '@/hooks/use-artist-onboarding'

export function ArtistOnboarding() {
  const auth = useAuth()
  const { submitting, error, submit } = useArtistOnboarding()
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

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
        <RevealOnScroll direction="up">
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
        </RevealOnScroll>
      </section>
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit({ titleRu, titleEn, statementRu, statementEn, hallDescRu, hallDescEn, location, websiteUrl, lang })
  }

  const t = {
    title: lang === 'ru' ? 'Стать художником' : 'Become an Artist',
    subtitle: lang === 'ru'
      ? 'Заполните профиль, чтобы получить выставочный зал и начать публиковать работы.'
      : 'Fill out your profile to get an exhibition hall and start publishing artworks.',
    hallTitle: lang === 'ru' ? 'Название зала' : 'Hall Title',
    hallTitleHint: lang === 'ru' ? 'Будет отображаться на двух языках' : 'Will be displayed in both languages',
    hallDesc: lang === 'ru' ? 'Описание зала' : 'Hall Description',
    statement: lang === 'ru' ? 'Творческое заявление / Artist Statement' : 'Artist Statement',
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
      <RevealOnScroll direction="up">
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
            <BilingualField
              lang={lang}
              onLangChange={setLang}
              label={t.hallTitle}
              required
              ruValue={titleRu}
              enValue={titleEn}
              onRuChange={setTitleRu}
              onEnChange={setTitleEn}
              placeholderRu="Мастерская Иванова"
              placeholderEn="Ivanov's Workshop"
              hintAfter={
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t.hallTitleHint}: {joinBilingualTitle(titleRu, titleEn) || '(пусто / empty)'}
                </p>
              }
            />

            <BilingualField
              lang={lang}
              onLangChange={setLang}
              label={t.statement}
              hintBefore={t.statementHint}
              ruValue={statementRu}
              enValue={statementEn}
              onRuChange={setStatementRu}
              onEnChange={setStatementEn}
              placeholderRu="Я работаю с цифровой скульптурой..."
              placeholderEn="I work with digital sculpture..."
              multiline
              rows={4}
            />

            <BilingualField
              lang={lang}
              onLangChange={setLang}
              label={t.hallDesc}
              ruValue={hallDescRu}
              enValue={hallDescEn}
              onRuChange={setHallDescRu}
              onEnChange={setHallDescEn}
              placeholderRu="Добро пожаловать в мою виртуальную галерею..."
              placeholderEn="Welcome to my virtual gallery..."
              multiline
              rows={3}
            />

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
              <p className="text-lg font-semibold mb-1 font-display">
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
      </RevealOnScroll>
    </section>
  )
}
