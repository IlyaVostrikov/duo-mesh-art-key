import { useState, useEffect, useRef } from 'react'
import { useParams } from '@tanstack/react-router'
import { HallHero } from '@/components/hall/HallHero'
import { HallWorksGrid } from '@/components/hall/HallWorksGrid'
import type { HallData } from '@/components/hall3d/hallOrdering'
import { FollowButton } from '@/components/FollowButton'
import { VerifiedBadge } from '@/components/ui/verified-badge'
import { assetUrl } from '@/lib/asset-url'
import { parseBilingualTitle, parseBilingual } from '@/lib/utils'
import { apiBaseUrl } from '@/lib/api'
import Container from '@/components/layout/Container'

interface HallArtwork {
  id: string
  title: string
  posterUrl: string | null
  modelUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  category: string | null
  price: string | null
  currency: string
  status: string
}

interface HallLayoutConfig {
  template: string
  slots: Array<{
    x: number; y: number; z: number
    width?: number; height?: number
    artworkId?: string | null
  }>
}

interface HallDetail {
  slug: string
  title: string
  description: string | null
  coverImageUrl: string | null
  viewCount: number
  theme: string | null
  customization: Record<string, unknown> | null
  layoutConfig: HallLayoutConfig | null
  artist: { id: string; displayName: string; avatarUrl: string | null; verified: boolean }
  artworks: HallArtwork[]
}

/** Floating artist/title overlay for the 3D scene — fades between halls. */
function HallOverlay({
  title,
  artist,
  lang,
  onToggleLang,
  transitionKey,
}: {
  title: string
  artist: { id: string; displayName: string; verified: boolean }
  lang: 'ru' | 'en'
  onToggleLang: () => void
  transitionKey: string
}) {
  const [visible, setVisible] = useState(true)
  const prevKey = useRef(transitionKey)

  useEffect(() => {
    if (prevKey.current !== transitionKey) {
      setVisible(false)
      const t = setTimeout(() => {
        prevKey.current = transitionKey
        setVisible(true)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [transitionKey])

  return (
    <div
      className="absolute bottom-6 left-6 z-10 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div
        className="pointer-events-auto"
        style={{
          backgroundColor: 'rgba(20,20,18,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)',
          padding: '14px 20px',
          color: '#fff',
          maxWidth: '380px',
        }}
      >
        <h2 className="text-lg font-display leading-snug mb-1" style={{ color: '#fff' }}>
          {title}
        </h2>
        <p className="text-sm flex items-center gap-1.5 mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {artist.displayName}
          {artist.verified && <VerifiedBadge size="sm" />}
        </p>
        <div className="flex items-center gap-2">
          <FollowButton artistId={artist.id} size="sm" />
          <button
            onClick={onToggleLang}
            className="text-xs font-medium px-2 py-0.5 rounded cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              border: 'none',
            }}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function HallPage() {
  const { hallSlug } = useParams({ from: '/hall/$hallSlug' })
  const [halls, setHalls] = useState<HallDetail[]>([])
  const [currentSlug, setCurrentSlug] = useState(hallSlug)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [use3D, setUse3D] = useState(() => {
    if (typeof window === 'undefined') return true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return !reduced && window.innerWidth >= 768
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      // Fetch published halls — the requested hall may not be published yet
      const res = await fetch(`${apiBaseUrl}/api/halls`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const published: HallDetail[] = await res.json()
      if (cancelled) return

      // If the requested hall is not in the published list, fetch it directly
      // (artist's own hall may be unpublished — direct endpoint returns it)
      if (!published.find((h) => h.slug === hallSlug)) {
        try {
          const direct = await fetch(`${apiBaseUrl}/api/halls/${hallSlug}`)
          if (direct.ok) {
            const hall: HallDetail = await direct.json()
            if (!cancelled) { setHalls([hall, ...published]); setCurrentSlug(hallSlug) }
            return
          }
        } catch { /* fall through to use published list */ }
      }

      if (!cancelled) { setHalls(published); setCurrentSlug(hallSlug) }
    }

    load()
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hallSlug])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    const onMotion = (e: MediaQueryListEvent) => setUse3D(!e.matches && window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.addEventListener('change', onMotion)
    return () => {
      window.removeEventListener('resize', onResize)
      mq.removeEventListener('change', onMotion)
    }
  }, [])

  // Loading
  if (loading) {
    return (
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16">
          <div className="space-y-4">
            <div className="h-10 w-64 bg-surface rounded animate-pulse" />
            <div className="h-6 w-40 bg-surface rounded animate-pulse" />
            <div className="h-32 w-full bg-surface rounded animate-pulse mt-8" />
          </div>
          <div className="animate-pulse bg-surface rounded-xl h-[500px]" />
        </div>
      </Container>
    )
  }

  const currentHall = halls.find((h) => h.slug === currentSlug)
  const hallData = halls.map((h) => ({
    slug: h.slug,
    title: h.title,
    theme: h.theme,
    coverImageUrl: h.coverImageUrl,
    customization: h.customization as HallData['customization'],
    artworks: h.artworks.map((aw) => ({
      id: aw.id,
      title: aw.title,
      posterUrl: aw.posterUrl ? assetUrl(aw.posterUrl) : null,
      modelUrl: aw.modelUrl ?? null,
      mediaType: aw.mediaType,
      displayTitle: parseBilingualTitle(aw.title)[0],
    })),
  }))
  const initialRoomIndex = halls.findIndex((h) => h.slug === hallSlug)

  const handleRoomChange = (slug: string) => {
    setCurrentSlug(slug)
    window.history.replaceState(null, '', '/hall/' + slug)
  }

  // Error
  if (error || !currentHall) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-24 text-center">
        <h2 className="text-2xl mb-2">
          {error ? 'Ошибка загрузки / Load error' : 'Зал не найден / Hall not found'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>{error || ''}</p>
      </div>
    )
  }

  const titleParts = parseBilingualTitle(currentHall.title)
  const descParts = currentHall.description ? parseBilingual(currentHall.description) : ['', '']
  const featuredWork = currentHall.artworks.find((aw) => aw.mediaType === 'MODEL_3D' && aw.modelUrl)

  // Desktop + 3D: immersive full-screen with floating overlay
  if (use3D && hallData.length > 0) {
    return (
      <div className="fixed inset-0" style={{ backgroundColor: 'var(--bg)' }}>
        <HallWorksGrid
          artworks={currentHall.artworks}
          artistName={currentHall.artist.displayName}
          layoutConfig={currentHall.layoutConfig}
          isMobile={false}
          halls={hallData}
          initialRoomIndex={initialRoomIndex >= 0 ? initialRoomIndex : 0}
          onRoomChange={handleRoomChange}
        />
        <HallOverlay
          title={titleParts[lang === 'ru' ? 0 : 1]}
          artist={currentHall.artist}
          lang={lang}
          onToggleLang={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          transitionKey={currentSlug}
        />
      </div>
    )
  }

  // Mobile / reduced motion: hero + grid layout
  return (
    <>
      <div className="max-w-7xl mx-auto px-5">
        <HallHero
          title={titleParts[lang === 'ru' ? 0 : 1]}
          artist={currentHall.artist}
          description={descParts[lang === 'ru' ? 0 : 1]}
          lang={lang}
          onToggleLang={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          featuredModel={featuredWork ? {
            modelUrl: featuredWork.modelUrl!,
            posterUrl: featuredWork.posterUrl ? assetUrl(featuredWork.posterUrl) : undefined,
            iosSrc: featuredWork.modelUrl!.replace(/\.(glb|gltf)$/i, '.usdz'),
          } : undefined}
        />
      </div>

      <HallWorksGrid
        artworks={currentHall.artworks}
        artistName={currentHall.artist.displayName}
        layoutConfig={currentHall.layoutConfig}
        isMobile={isMobile}
        halls={use3D ? hallData : undefined}
        initialRoomIndex={use3D ? (initialRoomIndex >= 0 ? initialRoomIndex : 0) : 0}
        onRoomChange={handleRoomChange}
      />
    </>
  )
}
