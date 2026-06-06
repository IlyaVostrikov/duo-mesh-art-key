import { useState, useEffect } from 'react'
import { LandingHero } from './LandingHero'
import { LandingManifesto } from './LandingManifesto'
import { LandingShaBirth } from './LandingShaBirth'
import { LandingOwnershipChain } from './LandingOwnershipChain'
import { LandingFeaturedWorks } from './LandingFeaturedWorks'
import { LandingFeaturedArtists } from './LandingFeaturedArtists'
import { LandingFeaturedHalls } from './LandingFeaturedHalls'
import { LandingFooterCTA } from './LandingFooterCTA'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { apiBaseUrl } from '@/lib/api'
import './artkey-landing.css'

interface FeaturedWork {
  id: string
  title: string
  artist: { displayName: string; hallSlug: string | null }
  posterUrl: string
  modelUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  medium: string | null
  price: string | null
  currency: string
  status: string
}

interface FeaturedArtist {
  id: string
  displayName: string
  location: string | null
  verified: boolean
  artistStatement: string | null
  avatarUrl: string | null
  hall: { slug: string; title: string; coverImageUrl: string | null } | null
}

interface FeaturedHall {
  slug: string
  title: string
  coverImageUrl: string | null
  viewCount: number
  artworkCount: number
  theme: string | null
  artist: { id: string; displayName: string; avatarUrl: string | null }
}

interface FeaturedResponse {
  hero: FeaturedWork | null
  works: FeaturedWork[]
  artists: FeaturedArtist[]
  halls: FeaturedHall[]
}

// Fallback hero — local 3D model always shown on main screen
const OFFLINE_HERO = {
  id: 'gregos-bordeaux',
  title: 'Gregos Art — Bordeaux / Грего — Бордо',
  artist: { displayName: 'Gregos', hallSlug: null },
  posterUrl: '/models/gregos-bordeaux/textures/gregos_at_bordeaux_1_baseColor.jpeg',
  modelUrl: '/models/gregos-bordeaux/scene.gltf',
  mediaType: 'MODEL_3D' as const,
  medium: 'Street sculpture / Уличная скульптура',
}

// Offline featured works
const OFFLINE_WORKS = [
  {
    id: 'arte-yawi-skeleton',
    title: 'Древний скелет / Ancient Skeleton Scan',
    artist: { displayName: 'Arte Yawi', hallSlug: null },
    posterUrl: '/models/arte_yawi_skeleton/textures/material0_baseColor.jpeg',
    modelUrl: '/models/arte_yawi_skeleton/scene.gltf',
    mediaType: 'MODEL_3D' as const,
    price: null,
    currency: 'RUB',
    status: 'PUBLISHED',
  },
  {
    id: 'nayarit-figure',
    title: 'Наяритская фигура 100–600 н.э. / Nayarit Seated Figure',
    artist: { displayName: 'Nayarit Culture', hallSlug: null },
    posterUrl: '/models/nayarit_seated_figure_100-600_ce/textures/material_0_diffuse.jpeg',
    modelUrl: '/models/nayarit_seated_figure_100-600_ce/scene.gltf',
    mediaType: 'MODEL_3D' as const,
    price: null,
    currency: 'RUB',
    status: 'PUBLISHED',
  },
  {
    id: 'gregos-bordeaux-work',
    title: 'Gregos Art — Bordeaux / Грего — Бордо',
    artist: { displayName: 'Gregos', hallSlug: null },
    posterUrl: '/models/gregos-bordeaux/textures/gregos_at_bordeaux_1_baseColor.jpeg',
    modelUrl: '/models/gregos-bordeaux/scene.gltf',
    mediaType: 'MODEL_3D' as const,
    price: null,
    currency: 'RUB',
    status: 'PUBLISHED',
  },
]

export function LandingPage() {
  const [data, setData] = useState<FeaturedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBaseUrl}/api/featured`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((err: unknown) => { if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-24 px-5 py-16">
        <Skeleton className="h-[70vh] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  // If backend is offline, show full offline experience
  if (error || !data) {
    return (
      <div className="artkey-landing">
        <LandingHero heroWork={OFFLINE_HERO} lang={lang} />
        <LandingManifesto />
        <LandingShaBirth />
        <LandingOwnershipChain />
        <LandingFeaturedWorks works={OFFLINE_WORKS} lang={lang} />
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 py-16 text-center">
          <Typography tone="muted" style={{ fontFamily: 'var(--ak-mono)', fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>
            {error
              ? 'Backend offline — showing offline preview / Бэкенд недоступен — офлайн-превью'
              : 'No featured data / Нет данных'}
          </Typography>
        </section>
        <LandingFooterCTA lang={lang} onToggleLang={() => setLang((l) => (l === 'ru' ? 'en' : 'ru'))} />
      </div>
    )
  }

  const mergedWorks = data.works.length >= 4 ? data.works : [...data.works, ...OFFLINE_WORKS].slice(0, 8)

  return (
    <div className="artkey-landing">
      <LandingHero heroWork={OFFLINE_HERO} lang={lang} />
      <LandingManifesto />
      <LandingShaBirth />
      <LandingOwnershipChain />
      <LandingFeaturedWorks works={mergedWorks} lang={lang} />
      <LandingFeaturedArtists artists={data.artists} lang={lang} />
      <LandingFeaturedHalls halls={data.halls} lang={lang} />
      <LandingFooterCTA lang={lang} onToggleLang={() => setLang((l) => (l === 'ru' ? 'en' : 'ru'))} />
    </div>
  )
}
