import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { joinBilingualTitle, joinBilingual } from '@/lib/utils'
import { BilingualField } from '@/components/BilingualField'
import { useArtistOnboarding, type OnboardingProfile, type CreatedArtist } from '@/hooks/use-artist-onboarding'
import { apiBaseUrl } from '@/lib/api'
import type { UploadProgress } from '@/lib/upload'
import { UploadProgressView } from '@/components/ui/upload-progress'

type Step = 'profile' | 'artwork' | 'done'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']

export function ArtistOnboarding() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { submitting, error, createProfile, uploadFile, uploadModelFile, clearError } = useArtistOnboarding()
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [step, setStep] = useState<Step>('profile')
  const [artist, setArtist] = useState<CreatedArtist | null>(null)

  // Step 1 — Profile
  const [titleRu, setTitleRu] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [statementRu, setStatementRu] = useState('')
  const [statementEn, setStatementEn] = useState('')
  const [hallDescRu, setHallDescRu] = useState('')
  const [hallDescEn, setHallDescEn] = useState('')
  const [location, setLocation] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Step 2 — First artwork
  const [awTitle, setAwTitle] = useState('')
  const [awTitleEn, setAwTitleEn] = useState('')
  const [awDesc, setAwDesc] = useState('')
  const [awDescEn, setAwDescEn] = useState('')
  const [awCategory, setAwCategory] = useState('DIGITAL')
  const [awMediaType, setAwMediaType] = useState<'IMAGE_2D' | 'MODEL_3D'>('IMAGE_2D')
  const [awPrice, setAwPrice] = useState('')
  const [awCurrency, setAwCurrency] = useState('RUB')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [awModelFile, setAwModelFile] = useState<File | null>(null)
  const [awUploading, setAwUploading] = useState(false)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  if (!auth.user) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-12">
        <RevealOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Стать художником / Become an Artist</CardTitle>
              <CardDescription>
                Войдите или создайте аккаунт, чтобы продолжить.<br />
                Log in or create an account to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/app" className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium rounded-4xl bg-[var(--accent)] text-[var(--accent-ink)] no-underline">
                Войти / Log in
              </a>
            </CardContent>
          </Card>
        </RevealOnScroll>
      </section>
    )
  }

  // ─── Step 1: Create profile ───
  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      const profile: OnboardingProfile = { titleRu, titleEn, statementRu, statementEn, hallDescRu, hallDescEn, location, websiteUrl, avatarFile, lang }
      const created = await createProfile(profile)
      setArtist(created)
      setStep('artwork')
    } catch { /* error set by hook */ }
  }

  // ─── Step 2: First artwork ───
  async function handleArtworkSubmit(e: FormEvent) {
    e.preventDefault()
    if (!artist) return
    clearError()
    setStep2Error(null)
    setUploadProgress(null)

    const fullTitle = awTitleEn.trim()
      ? `${awTitle.trim() || awTitleEn.trim()} / ${awTitleEn.trim()}`
      : awTitle.trim()
    if (!fullTitle) {
      // setError handled below
      return
    }

    setAwUploading(true)
    try {
      let posterUrl = 'seed/placeholder-poster.svg'
      let modelUrl: string | undefined
      if (posterFile) {
        const url = await uploadFile(posterFile, setUploadProgress)
        if (url) posterUrl = url
      }

      if (awMediaType === 'MODEL_3D') {
        if (!awModelFile) throw new Error('Загрузите 3D-модель GLB или ZIP-набор / Upload a GLB or ZIP bundle')
        modelUrl = await uploadModelFile(awModelFile, setUploadProgress) ?? undefined
        if (!modelUrl) throw new Error('Не удалось загрузить 3D-модель / 3D model upload failed')
      }

      const body: Record<string, unknown> = {
        title: fullTitle,
        description: joinBilingual(awDesc, awDescEn) || undefined,
        category: awCategory,
        mediaType: awMediaType,
        posterUrl,
        modelUrl,
        price: awPrice ? Number(awPrice) : undefined,
        currency: awCurrency,
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

      setStep('done')
    } catch (err) {
      // error is handled by the component state
      setStep2Error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setAwUploading(false)
    }
  }

  async function handleSkipArtwork() {
    if (artist) {
      navigate({ to: '/hall/$hallSlug', params: { hallSlug: artist.hall.slug } })
    }
  }

  // ─── i18n ───
  const t = {
    step1title: lang === 'ru' ? 'Шаг 1: Профиль' : 'Step 1: Profile',
    step1sub: lang === 'ru'
      ? 'Заполните профиль, чтобы получить выставочный зал.'
      : 'Fill out your profile to get an exhibition hall.',
    step2title: lang === 'ru' ? 'Шаг 2: Первая работа' : 'Step 2: First Artwork',
    step2sub: lang === 'ru'
      ? 'Опубликуйте свою первую работу. Можно пропустить и добавить позже.'
      : 'Publish your first artwork. You can skip and add later.',
    step3title: lang === 'ru' ? 'Готово!' : 'Done!',
    step3sub: lang === 'ru'
      ? 'Ваш выставочный зал создан. Теперь вы можете добавлять работы, настраивать зал и принимать запросы от покупателей.'
      : 'Your exhibition hall is ready. You can now add artworks, customize your hall, and receive inquiries from buyers.',
    hallTitle: lang === 'ru' ? 'Название зала' : 'Hall Title',
    hallDesc: lang === 'ru' ? 'Описание зала' : 'Hall Description',
    statement: lang === 'ru' ? 'Творческое заявление / Artist Statement' : 'Artist Statement',
    statementHint: lang === 'ru'
      ? 'Расскажите о своей художественной практике, методах и философии.'
      : 'Tell about your artistic practice, methods, and philosophy.',
    location: lang === 'ru' ? 'Город / Страна' : 'City / Country',
    website: lang === 'ru' ? 'Сайт (опционально)' : 'Website (optional)',
    avatar: lang === 'ru' ? 'Аватар (опционально)' : 'Avatar (optional)',
    submitProfile: lang === 'ru' ? 'Продолжить' : 'Continue',
    submittingProfile: lang === 'ru' ? 'Создание...' : 'Creating...',
    awTitleLabel: lang === 'ru' ? 'Название работы' : 'Artwork Title',
    awCatLabel: lang === 'ru' ? 'Категория' : 'Category',
    awPosterLabel: lang === 'ru' ? 'Изображение / Постер' : 'Image / Poster',
    awPriceLabel: lang === 'ru' ? 'Цена (опционально)' : 'Price (optional)',
    skipArtwork: lang === 'ru' ? 'Пропустить, добавить позже' : 'Skip, add later',
    submitArtwork: lang === 'ru' ? 'Опубликовать работу' : 'Publish Artwork',
    goToHall: lang === 'ru' ? 'Перейти в зал' : 'Go to Hall',
    toDashboard: lang === 'ru' ? 'В панель управления' : 'To Dashboard',
    preview: lang === 'ru' ? 'Предпросмотр' : 'Preview',
    previewDesc: lang === 'ru'
      ? 'Так ваш зал будет выглядеть в галерее.'
      : 'This is how your hall will appear in the gallery.',
  }

  // ─── Step indicator ───
  const steps: { key: Step; label: string }[] = [
    { key: 'profile', label: lang === 'ru' ? 'Профиль' : 'Profile' },
    { key: 'artwork', label: lang === 'ru' ? 'Работа' : 'Artwork' },
    { key: 'done', label: lang === 'ru' ? 'Готово' : 'Done' },
  ]
  const currentStepIdx = steps.findIndex((s) => s.key === step)

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-12">
      <RevealOnScroll direction="up">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {step === 'profile' ? t.step1title : step === 'artwork' ? t.step2title : t.step3title}
                </CardTitle>
                <CardDescription className="mt-2">
                  {step === 'profile' ? t.step1sub : step === 'artwork' ? t.step2sub : t.step3sub}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
                className="text-xs font-medium px-3 py-1 rounded-full border"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)', cursor: 'pointer' }}
              >
                {lang === 'ru' ? 'EN' : 'RU'}
              </button>
            </div>

            {/* Step dots */}
            {step !== 'done' && (
              <div className="flex items-center gap-2 mt-4">
                {steps.filter((s) => s.key !== 'done').map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: i <= currentStepIdx ? 'var(--accent)' : 'var(--surface)',
                        color: i <= currentStepIdx ? 'var(--accent-ink)' : 'var(--text-muted)',
                        border: i > currentStepIdx ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs" style={{ color: i <= currentStepIdx ? 'var(--text)' : 'var(--text-muted)' }}>
                      {s.label}
                    </span>
                    {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: 'var(--border)' }} />}
                  </div>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* ─── STEP 1: Profile ─── */}
            {step === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <FileUpload
                  accept=".jpg,.jpeg,.png,.webp"
                  maxSize={5 * 1024 * 1024}
                  onFileSelect={setAvatarFile}
                  label={t.avatar}
                  imagePreview
                />

                <BilingualField
                  lang={lang} onLangChange={setLang} label={t.hallTitle} required
                  ruValue={titleRu} enValue={titleEn}
                  onRuChange={setTitleRu} onEnChange={setTitleEn}
                  placeholderRu="Мастерская Иванова" placeholderEn="Ivanov's Workshop"
                  hintAfter={
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {joinBilingualTitle(titleRu, titleEn) || '(пусто / empty)'}
                    </p>
                  }
                />

                <BilingualField
                  lang={lang} onLangChange={setLang} label={t.statement}
                  hintBefore={t.statementHint}
                  ruValue={statementRu} enValue={statementEn}
                  onRuChange={setStatementRu} onEnChange={setStatementEn}
                  placeholderRu="Я работаю с цифровой скульптурой..." placeholderEn="I work with digital sculpture..."
                  multiline rows={4}
                />

                <BilingualField
                  lang={lang} onLangChange={setLang} label={t.hallDesc}
                  ruValue={hallDescRu} enValue={hallDescEn}
                  onRuChange={setHallDescRu} onEnChange={setHallDescEn}
                  placeholderRu="Добро пожаловать в мою виртуальную галерею..." placeholderEn="Welcome to my virtual gallery..."
                  multiline rows={3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{t.location}</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Москва, Россия" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{t.website}</label>
                    <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" type="url" />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
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
                      {(lang === 'ru' ? (statementRu || statementEn) : (statementEn || statementRu)).slice(0, 150)}
                      {((lang === 'ru' ? (statementRu || statementEn) : (statementEn || statementRu))).length > 150 ? '...' : ''}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.previewDesc}</p>
                  )}
                </div>

                {error && (
                  <p className="text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? t.submittingProfile : t.submitProfile}
                </Button>
              </form>
            )}

            {/* ─── STEP 2: First Artwork ─── */}
            {step === 'artwork' && (
              <form onSubmit={handleArtworkSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Название (RU)</label>
                    <Input value={awTitle} onChange={(e) => setAwTitle(e.target.value)} placeholder="Цифровой пейзаж" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Title (EN)</label>
                    <Input value={awTitleEn} onChange={(e) => setAwTitleEn(e.target.value)} placeholder="Digital Landscape" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Описание (RU)</label>
                    <textarea
                      value={awDesc} onChange={(e) => setAwDesc(e.target.value)} rows={3}
                      placeholder="Описание работы..."
                      className="w-full px-3 py-2 text-sm rounded-xl border"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)', resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Description (EN)</label>
                    <textarea
                      value={awDescEn} onChange={(e) => setAwDescEn(e.target.value)} rows={3}
                      placeholder="Artwork description..."
                      className="w-full px-3 py-2 text-sm rounded-xl border"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <FileUpload
                  accept=".jpg,.jpeg,.png,.webp,.svg"
                  maxSize={10 * 1024 * 1024}
                  onFileSelect={setPosterFile}
                  label={t.awPosterLabel}
                  imagePreview
                />
                {awMediaType === 'MODEL_3D' && (
                  <FileUpload
                    accept=".zip,.glb"
                    maxSize={200 * 1024 * 1024}
                    onFileSelect={setAwModelFile}
                    label={awModelFile ? `3D набор: ${awModelFile.name}` : '3D-модель или ZIP-набор (.glb или .zip) / 3D model or ZIP bundle'}
                  />
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Тип / Media</label>
                    <Tabs value={awMediaType} onValueChange={(v) => setAwMediaType(v as 'IMAGE_2D' | 'MODEL_3D')}>
                      <TabsList className="h-8">
                        <TabsTrigger value="IMAGE_2D" className="text-xs px-3">2D</TabsTrigger>
                        <TabsTrigger value="MODEL_3D" className="text-xs px-3">3D</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{t.awCatLabel}</label>
                    <select
                      value={awCategory}
                      onChange={(e) => setAwCategory(e.target.value)}
                      className="w-full h-9 px-3 text-sm rounded-4xl border"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{t.awPriceLabel}</label>
                    <Input value={awPrice} onChange={(e) => setAwPrice(e.target.value)} type="number" placeholder="15000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Валюта</label>
                    <Tabs value={awCurrency} onValueChange={(v) => setAwCurrency(v)}>
                      <TabsList className="h-8">
                        <TabsTrigger value="RUB" className="text-xs px-3">₽ RUB</TabsTrigger>
                        <TabsTrigger value="USD" className="text-xs px-3">$ USD</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                <UploadProgressView progress={uploadProgress} />

                {step2Error && (
                  <p className="text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {step2Error}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" size="lg" className="flex-1" disabled={awUploading}>
                    {awUploading ? (lang === 'ru' ? 'Загрузка...' : 'Uploading...') : t.submitArtwork}
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={handleSkipArtwork}>
                    {t.skipArtwork}
                  </Button>
                </div>
              </form>
            )}

            {/* ─── STEP 3: Done ─── */}
            {step === 'done' && artist && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 font-display">{artist.hall.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                    {t.step3sub}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={() => navigate({ to: '/hall/$hallSlug', params: { hallSlug: artist.hall.slug } })}>
                    {t.goToHall}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate({ to: '/dashboard' })}>
                    {t.toDashboard}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </RevealOnScroll>
    </section>
  )
}
