import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { HallHero } from '@/components/hall/HallHero'
import { HallWorksGrid } from '@/components/hall/HallWorksGrid'
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
  layoutConfig: HallLayoutConfig | null
  artist: { id: string; displayName: string; avatarUrl: string | null; verified: boolean }
  artworks: HallArtwork[]
}

export function HallPage() {
  const { hallSlug } = useParams({ from: '/hall/$hallSlug' })
  const [hall, setHall] = useState<HallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${apiBaseUrl}/api/halls/${hallSlug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'NOT_FOUND' : `HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => { if (!cancelled) setHall(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hallSlug])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ─── Loading ───
  if (loading) {
    return (
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16">
          <div className="space-y-4">
            <div className="h-10 w-64 bg-surface rounded animate-pulse" />
            <div className="h-6 w-40 bg-surface rounded animate-pulse" />
            <div className="h-32 w-full bg-surface rounded animate-pulse mt-8" />
          </div>
          <div className="animate-pulse bg-surface rounded-xl" style={{ height: '500px' }} />
        </div>
      </Container>
    )
  }

  // ─── Error ───
  if (error || !hall) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-24 text-center">
        <h2 className="text-2xl mb-2">
          {error === 'NOT_FOUND' ? 'Зал не найден / Hall not found' : 'Ошибка загрузки / Load error'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>{error !== 'NOT_FOUND' ? error : ''}</p>
      </div>
    )
  }

  // ─── Content ───
  const titleParts = parseBilingualTitle(hall.title)
  const descParts = hall.description ? parseBilingual(hall.description) : ['', '']
  const featuredWork = hall.artworks.find((aw) => aw.mediaType === 'MODEL_3D' && aw.modelUrl)

  return (
    <>
      <div className="max-w-7xl mx-auto px-5">
        <HallHero
          title={titleParts[lang === 'ru' ? 0 : 1]}
          artist={hall.artist}
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
        artworks={hall.artworks}
        artistName={hall.artist.displayName}
        layoutConfig={hall.layoutConfig}
        isMobile={isMobile}
        theme={hall.theme}
      />
    </>
  )
}
