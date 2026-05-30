import { useState, useEffect, useCallback, useRef } from 'react'
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { assetUrl } from '@/lib/asset-url'

interface ArtworkItem {
  id: string
  title: string
  artist: { displayName: string | null; hallSlug: string | null }
  posterUrl: string
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  price: string | null
  currency: string
  status: string
  category: string
  styleTags: string[]
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые / Newest' },
  { value: 'oldest', label: 'Старые / Oldest' },
  { value: 'price_asc', label: 'Цена ↑ / Price ↑' },
  { value: 'price_desc', label: 'Цена ↓ / Price ↓' },
  { value: 'popular', label: 'Популярные / Popular' },
]

const MEDIA_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'IMAGE_2D', label: '2D' },
  { value: 'MODEL_3D', label: '3D' },
]

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export function GalleryPage() {
  const [artworks, setArtworks] = useState<ArtworkItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mediaFilter, setMediaFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setSearch(value.trim()), 350)
  }

  const fetchArtworks = useCallback(async (media: string, sortBy: string, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ sort: sortBy, pageSize: '50' })
      if (media) params.set('mediaType', media)
      if (q) params.set('q', q)
      const res = await fetch(`${API_BASE}/api/artworks?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArtworks(mediaFilter, sort, search)
  }, [mediaFilter, sort, search, fetchArtworks])

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
      {/* Hero row */}
      <header style={{ paddingTop: '48px', paddingBottom: '64px' }}>
        <h1 className="text-display-hero" style={{ marginBottom: '16px' }}>
          Галерея / Gallery
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', lineHeight: 1.6 }}>
          Кураторская подборка независимых художников.
          <br />
          A curated selection of independent artists.
        </p>
        {total > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AnimatedCounter value={total} />
            {' '}
            {total === 1 ? 'работа / work' : total < 5 ? 'работы / works' : 'работ / works'}
          </p>
        )}
      </header>

      {/* Filters bar */}
      <div
        className="flex flex-wrap items-center gap-4"
        style={{
          paddingBottom: '32px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '48px',
        }}
      >
        {/* Media filter */}
        <div className="flex items-center gap-2">
          {MEDIA_FILTERS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMediaFilter(m.value)}
              className="px-3 py-1 text-sm font-medium hover:text-text"
              style={{
                borderRadius: 'var(--radius)',
                backgroundColor: mediaFilter === m.value ? 'var(--surface-2)' : 'transparent',
                color: mediaFilter === m.value ? 'var(--text)' : 'var(--text-muted)',
                border: `1px solid ${mediaFilter === m.value ? 'var(--accent)' : 'transparent'}`,
                transition: `all var(--dur-fast) var(--ease)`,
                cursor: 'pointer',
                transform: mediaFilter === m.value ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Поиск / Search..."
          aria-label="Search artworks"
          style={{
            flex: 1,
            maxWidth: '320px',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '6px 12px',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = '0 0 0 1px rgba(198,255,58,0.2)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="ml-auto text-sm px-3 py-1"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content area */}
      {loading && (
        <div
          className="grid gap-x-6 gap-y-12"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            paddingBottom: '96px',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <ArtworkCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Не удалось загрузить галерею / Failed to load gallery
          </p>
          <button
            onClick={() => fetchArtworks(mediaFilter, sort, search)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              borderRadius: 'var(--radius)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Попробовать снова / Retry
          </button>
        </div>
      )}

      {!loading && !error && artworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
            Ничего не найдено / No results
          </p>
        </div>
      )}

      {!loading && !error && artworks.length > 0 && (
        <div
          className="grid gap-x-6 gap-y-12"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            paddingBottom: '96px',
          }}
        >
          {artworks.map((aw, i) => (
            <RevealOnScroll key={aw.id} direction="up" delay={i * 60}>
              <ArtworkCard
                id={aw.id}
                title={aw.title}
                artistName={aw.artist.displayName ?? 'Unknown'}
                posterUrl={assetUrl(aw.posterUrl)}
                mediaType={aw.mediaType}
                price={aw.price}
                currency={aw.currency}
                status={aw.status}
              />
            </RevealOnScroll>
          ))}
        </div>
      )}
    </div>
  )
}
