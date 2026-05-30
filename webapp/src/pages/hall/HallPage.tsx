import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { assetUrl } from '@/lib/asset-url'

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

interface HallDetail {
  slug: string
  title: string
  description: string | null
  coverImageUrl: string | null
  viewCount: number
  artist: { id: string; displayName: string; avatarUrl: string | null }
  artworks: HallArtwork[]
}

function parseBilingual(text: string): [string, string] {
  // Matches the seed format (\n\n) and the onboarding-join format (\n\n---\n\n)
  const sep = text.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
  const idx = text.indexOf(sep)
  if (idx === -1) return [text, text]
  const ru = text.slice(0, idx)
  const en = text.slice(idx + sep.length).replace(/^\n+/, '')
  return [ru, en || ru]
}

function parseBilingualTitle(title: string): [string, string] {
  const idx = title.lastIndexOf(' / ')
  if (idx === -1) return [title, title]
  return [title.slice(0, idx), title.slice(idx + 3)]
}

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export function HallPage() {
  const { hallSlug } = useParams({ from: '/hall/$hallSlug' })
  const [hall, setHall] = useState<HallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/halls/${hallSlug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'NOT_FOUND' : `HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => { if (!cancelled) setHall(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hallSlug])

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
          {error === 'NOT_FOUND' ? 'Зал не найден / Hall not found' : 'Ошибка загрузки / Load error'}
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
          <h1 className="text-display-hero" style={{ marginBottom: '24px' }}>
            {titleParts[lang === 'ru' ? 0 : 1]}
          </h1>
          <p className="text-display-sm" style={{
            color: 'var(--text-secondary)', marginBottom: '32px', fontFamily: 'var(--font-display)',
          }}>
            {hall.artist.displayName}
          </p>

          <blockquote style={{
            fontFamily: 'var(--font-editorial)', fontSize: '1.5rem', lineHeight: 1.5,
            color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '540px',
            paddingLeft: '16px', borderLeft: '2px solid var(--accent)', marginBottom: '24px',
            whiteSpace: 'pre-wrap',
          }}>
            {descParts[lang === 'ru' ? 0 : 1]}
          </blockquote>

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
        </div>

        {is3DFeatured && featuredWork && (
          <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', height: '500px', boxShadow: 'var(--elev-2)' }}>
            <ModelViewer3D
              modelUrl={featuredWork.modelUrl!}
              posterUrl={featuredWork.posterUrl ? assetUrl(featuredWork.posterUrl) : undefined}
            />
          </div>
        )}
      </header>

      {/* Works */}
      <section style={{ paddingBottom: '96px' }}>
        <h2 className="text-display-sm" style={{ marginBottom: '48px', fontFamily: 'var(--font-display)' }}>
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
                <div key={work.id} style={{ gridColumn: spans.col }}>
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
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
