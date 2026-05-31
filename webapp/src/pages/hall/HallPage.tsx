import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { FollowButton } from '@/components/FollowButton'
import { assetUrl } from '@/lib/asset-url'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Hall3DCanvas } from '@/components/hall3d/Hall3DCanvas'
import { singleRow, salonHang } from '@/components/hall3d/layoutTemplates'
import type { Hall3DArtwork } from '@/components/hall3d/Hall3DScene'
import { apiBaseUrl } from '@/lib/api'

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
  layoutConfig: HallLayoutConfig | null
  artist: { id: string; displayName: string; avatarUrl: string | null; verified: boolean }
  artworks: HallArtwork[]
}

import { parseBilingual, parseBilingualTitle } from '@/lib/utils'

export function HallPage() {
  const { hallSlug } = useParams({ from: '/hall/$hallSlug' })
  const navigate = useNavigate()
  const reduced = useReducedMotion()
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

  // ─── All hooks before early returns (Rules of Hooks) ───

  const hall3dArtworks = useMemo<Hall3DArtwork[]>(() =>
    (hall?.artworks ?? []).map((aw) => ({
      id: aw.id,
      title: aw.title,
      posterUrl: aw.posterUrl ? assetUrl(aw.posterUrl) : null,
      modelUrl: aw.modelUrl ?? null,
      mediaType: aw.mediaType,
      displayTitle: parseBilingualTitle(aw.title)[0],
    })), [hall?.artworks])

  const layout3d = useMemo(() => {
    if (hall?.layoutConfig?.slots?.length) {
      return {
        name: hall.layoutConfig.template,
        capacity: hall.layoutConfig.slots.length,
        slots: hall.layoutConfig.slots.map((s) => ({
          x: s.x, y: s.y, z: s.z,
          width: s.width, height: s.height,
        })),
      }
    }
    return (hall?.artworks?.length ?? 0) <= 4 ? singleRow : salonHang
  }, [hall?.layoutConfig, hall?.artworks?.length])

  const sorted3dArtworks = useMemo(() => {
    if (!hall?.layoutConfig?.slots) return hall3dArtworks
    const map = new Map(hall3dArtworks.map((a) => [a.id, a]))
    const result: Hall3DArtwork[] = []
    const used = new Set<string>()
    for (const slot of hall.layoutConfig.slots) {
      if (slot.artworkId && map.has(slot.artworkId)) {
        result.push(map.get(slot.artworkId)!)
        used.add(slot.artworkId)
      }
    }
    for (const a of hall3dArtworks) {
      if (!used.has(a.id)) result.push(a)
    }
    return result
  }, [hall3dArtworks, hall?.layoutConfig])

  const handleArtworkClick = useCallback((id: string) => {
    navigate({ to: '/artwork/$artworkId', params: { artworkId: id } })
  }, [navigate])

  const show3D = !reduced && !isMobile

  // ─── Loading ───
  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12" style={{ paddingTop: '64px' }}>
          <div className="space-y-4">
            <div className="h-10 w-64 bg-[var(--surface)] rounded animate-pulse" />
            <div className="h-6 w-40 bg-[var(--surface)] rounded animate-pulse" />
            <div className="h-32 w-full bg-[var(--surface)] rounded animate-pulse mt-8" />
          </div>
          <div className="animate-pulse bg-[var(--surface)] rounded-xl" style={{ height: '500px' }} />
        </div>
      </div>
    )
  }

  // ─── Error ───
  if (error || !hall) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
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
  const is3DFeatured = Boolean(featuredWork)

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
      {/* Hero */}
      <header style={{
        paddingTop: '64px', paddingBottom: '80px',
        display: 'grid',
        gridTemplateColumns: is3DFeatured ? '1fr 1fr' : '1fr',
        gap: '48px', alignItems: 'center',
      }}>
        <div>
          <RevealOnScroll direction="up">
            <h1 className="text-display-hero" style={{ marginBottom: '24px' }}>
              {titleParts[lang === 'ru' ? 0 : 1]}
            </h1>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={80}>
            <p className="text-display-sm" style={{
              color: 'var(--text-secondary)', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              {hall.artist.displayName}
              {hall.artist.verified && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.65rem', fontWeight: 600,
                  color: 'var(--accent)', border: '1px solid rgba(198,255,58,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
              )}
            </p>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={100}>
            <div style={{ marginBottom: '24px' }}>
              <FollowButton artistId={hall.artist.id} size="sm" />
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="up" delay={160}>
            <blockquote className="font-editorial" style={{
              fontSize: '1.5rem', lineHeight: 1.5,
              color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '540px',
              paddingLeft: '16px', borderLeft: '2px solid var(--accent)', marginBottom: '24px',
              whiteSpace: 'pre-wrap',
            }}>
              {descParts[lang === 'ru' ? 0 : 1]}
            </blockquote>
          </RevealOnScroll>

          <RevealOnScroll direction="up" delay={240}>
            <button
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="text-sm font-medium px-3 py-1"
              style={{
                backgroundColor: 'var(--surface)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
                transition: `all var(--dur-fast) var(--ease)`,
              }}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </RevealOnScroll>
        </div>

        {is3DFeatured && featuredWork && (
          <RevealOnScroll direction="up" delay={120}>
            <div
              data-lenis-prevent
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden', height: '500px', boxShadow: 'var(--elev-2)' }}
            >
              <ModelViewer3D
                modelUrl={featuredWork.modelUrl!}
                posterUrl={featuredWork.posterUrl ? assetUrl(featuredWork.posterUrl) : undefined}
                iosSrc={featuredWork.modelUrl!.replace(/\.(glb|gltf)$/i, '.usdz')}
              />
            </div>
          </RevealOnScroll>
        )}
      </header>

      {/* Works — 3D Gallery Wall (desktop + no reduced motion) or 2D grid fallback */}
      {show3D && hall.artworks.length > 0 ? (
        <section style={{ paddingBottom: '0' }}>
          <Hall3DCanvas
            artworks={sorted3dArtworks}
            layout={layout3d}
            onArtworkClick={handleArtworkClick}
          />
        </section>
      ) : (
        <section style={{ paddingBottom: '96px' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '48px' }}>
            Работы / Works
          </h2>

          {hall.artworks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Пока нет работ / No artworks yet.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '24px',
            }}>
              {hall.artworks.map((work, i) => {
                const spans = [
                  { col: 'span 6' }, { col: 'span 6' }, { col: 'span 8' }, { col: 'span 4' },
                ][i % 4]
                return (
                  <RevealOnScroll key={work.id} direction="up" delay={i * 60}>
                    <div style={{ gridColumn: spans.col }}>
                      <ArtworkCard
                        id={work.id}
                        title={parseBilingualTitle(work.title)[0]}
                        artistName={hall.artist.displayName}
                        posterUrl={assetUrl(work.posterUrl ?? '')}
                        mediaType={work.mediaType}
                        price={work.price}
                        currency={work.currency}
                        status={work.status}
                      />
                    </div>
                  </RevealOnScroll>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
