/*
  DESIGN V2 — LandingHero
  Заменяет: src/pages/landing/LandingHero.tsx

  Изменения vs оригинал:
  - Шрифт заголовка: Figtree 800 weight (большой гротеск) вместо Unbounded
  - ParticleField возвращён, но с меньшим count и connectionDistance
  - float — только на изображении, не на тексте
  - Spotlight cursor — оставлен (он деликатный)
  - shimmer badge — оставлен
  - glow-pulse на рамке изображения вместо breathe
  - Убрана анимация float с текстового блока
  - Вертикальный разделитель + музейная этикетка под работой
*/
import { useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ParticleField } from '@/components/motion/ParticleField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface HeroProps {
  heroWork: {
    id: string
    title: string
    artist: { displayName: string; hallSlug: string | null }
    posterUrl: string
    modelUrl: string | null
    mediaType: 'IMAGE_2D' | 'MODEL_3D'
    medium: string | null
  } | null
  lang: 'ru' | 'en'
}

const MISSION = 'Цифровое искусство с доказуемой подлинностью'
const SUB = 'Виртуальные 3D-галереи, SHA-256 ArtKey-сертификаты и provenance-цепочки — платформа для художников и коллекционеров нового поколения.'

export function LandingHero({ heroWork, lang }: HeroProps) {
  const [artworkRu] = heroWork ? parseBilingualTitle(heroWork.title) : ['']
  const spotlightRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = spotlightRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    requestAnimationFrame(() => {
      el.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(198,255,58,0.035), transparent 65%)`
      el.style.opacity = '1'
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = spotlightRef.current
    if (el) el.style.opacity = '0'
  }, [])

  return (
    <section
      className="relative mx-auto w-full max-w-6xl overflow-hidden px-5 py-12 lg:py-20"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Particles — меньше count, больше дистанция */}
      <ParticleField particleCount={22} connectionDistance={120} />

      {/* Cursor spotlight */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 z-0"
        style={{ opacity: 0, transition: 'opacity 0.5s ease' }}
      />

      {/* Верхняя метка */}
      <div
        className="relative z-10 mb-10 flex items-center justify-between border-b pb-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.65rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Платформа верифицированного цифрового искусства
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
          }}
        >
          2026
        </span>
      </div>

      {/* Основная сетка */}
      <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_1px_480px] lg:items-start">

        {/* Левая колонка — текст, БЕЗ float-анимации */}
        <div className="grid gap-6">

          {/* Shimmer badge */}
          <Badge
            variant="outline"
            className="w-fit border-accent/30 text-accent relative overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(198,255,58,0.08) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3.5s ease-in-out infinite',
            }}
          >
            DUO MESH
          </Badge>

          {/* Большой гротеск — Figtree */}
          <h1
            className="text-display-hero"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {MISSION}
          </h1>

          <Typography
            variant="body"
            tone="muted"
            className="max-w-xl"
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '1.15rem',
              lineHeight: 1.65,
            }}
          >
            {SUB}
          </Typography>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/gallery">Смотреть галерею</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/verify">Проверить сертификат</Link>
            </Button>
          </div>

          {heroWork && artworkRu && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '20px',
                display: 'grid',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Избранная работа
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <Link
                  to="/artwork/$artworkId"
                  params={{ artworkId: heroWork.id }}
                  style={{
                    fontFamily: 'var(--font-editorial)',
                    fontStyle: 'italic',
                    fontSize: '1.05rem',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {artworkRu}
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                <Link
                  to="/hall/$hallSlug"
                  params={{ hallSlug: heroWork.artist.hallSlug ?? '' }}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  {heroWork.artist.displayName}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Вертикальный разделитель */}
        <div
          className="hidden lg:block"
          style={{ background: 'var(--border)', minHeight: '500px' }}
        />

        {/* Правая колонка — изображение, float на нём */}
        <div className="relative z-10">
          {heroWork && heroWork.mediaType === 'MODEL_3D' && heroWork.modelUrl ? (
            <div
              className="overflow-hidden rounded-lg border relative"
              style={{
                height: '68vh',
                minHeight: '480px',
                animation: 'float 7s ease-in-out infinite, glow-pulse 4s ease-in-out infinite',
                borderColor: 'var(--border)',
              }}
              data-lenis-prevent
            >
              <ModelViewer3D
                modelUrl={heroWork.modelUrl}
                posterUrl={assetUrl(heroWork.posterUrl)}
                iosSrc={heroWork.modelUrl.replace(/\.(glb|gltf)$/i, '.usdz')}
              />
            </div>
          ) : heroWork ? (
            <div
              className="overflow-hidden rounded-lg border"
              style={{
                height: '68vh',
                minHeight: '480px',
                animation: 'float 7s ease-in-out infinite, glow-pulse 4s ease-in-out infinite',
                borderColor: 'var(--border)',
              }}
            >
              <img
                src={assetUrl(heroWork.posterUrl)}
                alt={artworkRu}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-lg border bg-surface-2"
              style={{ height: '68vh', minHeight: '480px' }}
            >
              <Typography tone="muted">Загрузка...</Typography>
            </div>
          )}

          {/* Музейная этикетка */}
          {heroWork && (
            <div
              style={{
                marginTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '0 2px',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-editorial)',
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  {heroWork.artist.displayName}
                </p>
                {heroWork.medium && (
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.03em',
                      margin: '3px 0 0',
                    }}
                  >
                    {heroWork.medium}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-brand)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                {heroWork.mediaType === 'MODEL_3D' ? '3D' : '2D'}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
