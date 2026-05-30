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

const MISSION_RU = 'Цифровое искусство с проверяемой подлинностью'
const MISSION_EN = 'Digital Art with Verifiable Authenticity'
const SUB_RU = 'Виртуальные 3D-галереи, SHA-256 ArtKey-сертификаты и provenance-цепочки — платформа для художников и коллекционеров нового поколения.'
const SUB_EN = 'Virtual 3D galleries, SHA-256 ArtKey certificates, and provenance chains — a platform for next-generation artists and collectors.'

export function LandingHero({ heroWork, lang }: HeroProps) {
  const [artworkRu, artworkEn] = heroWork ? parseBilingualTitle(heroWork.title) : ['', '']
  const artworkTitle = lang === 'ru' ? artworkRu : artworkEn
  const spotlightRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = spotlightRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Direct DOM write via RAF — zero React re-renders
    requestAnimationFrame(() => {
      el.style.background = `radial-gradient(400px circle at ${x}px ${y}px, rgba(198,255,58,0.04), transparent 60%)`
      el.style.opacity = '1'
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = spotlightRef.current
    if (el) el.style.opacity = '0'
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:py-20 overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Particle field background */}
      <ParticleField particleCount={35} connectionDistance={90} />

      {/* Cursor spotlight — DOM-driven, zero React renders */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          opacity: 0,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Text block — floats subtly */}
      <div
        className="grid gap-5 relative z-10"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <Badge
          variant="outline"
          className="w-fit border-accent/30 text-accent relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(198,255,58,0.06) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        >
          DUO MESH
        </Badge>
        <h1
          className="text-display-hero leading-[1.08] tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {lang === 'ru' ? MISSION_RU : MISSION_EN}
        </h1>
        <Typography
          variant="body"
          tone="muted"
          className="max-w-xl"
          style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.15rem', lineHeight: 1.6 }}
        >
          {lang === 'ru' ? SUB_RU : SUB_EN}
        </Typography>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/gallery">
              {lang === 'ru' ? 'Смотреть галерею' : 'Explore Gallery'}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/verify">
              {lang === 'ru' ? 'Проверить сертификат' : 'Verify Certificate'}
            </Link>
          </Button>
        </div>
        {heroWork && artworkTitle && (
          <Typography variant="caption" tone="muted" className="mt-2">
            {lang === 'ru' ? 'Избранная работа:' : 'Featured work:'}{' '}
            <Link to="/artwork/$artworkId" params={{ artworkId: heroWork.id }} className="text-accent hover:underline">
              {artworkTitle}
            </Link>
            {' — '}
            <Link
              to="/hall/$hallSlug"
              params={{ hallSlug: heroWork.artist.hallSlug ?? '' }}
              className="text-text-secondary hover:underline"
            >
              {heroWork.artist.displayName}
            </Link>
          </Typography>
        )}
      </div>

      {/* 3D Viewer */}
      {heroWork && heroWork.mediaType === 'MODEL_3D' && heroWork.modelUrl ? (
        <div
          className="overflow-hidden rounded-xl border bg-black relative z-10"
          style={{
            height: '70vh',
            minHeight: '500px',
            boxShadow: '0 0 80px rgba(198,255,58,0.06)',
            animation: 'breathe 3s ease-in-out infinite',
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
        <div className="overflow-hidden rounded-xl border bg-black relative z-10" style={{ height: '70vh', minHeight: '500px' }}>
          <img
            src={assetUrl(heroWork.posterUrl)}
            alt={artworkTitle}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex min-h-[70vh] items-center justify-center rounded-xl border bg-surface-2 relative z-10">
          <Typography tone="muted">{lang === 'ru' ? 'Загрузка...' : 'Loading...'}</Typography>
        </div>
      )}
    </section>
  )
}
