import { useState, useEffect, useCallback, useRef } from 'react'
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { FilterTab } from '@/components/ui/filter-tab'
import { SearchField } from '@/components/ui/search-field'
import { GalleryHeader } from '@/components/ui/gallery-header'
import { assetUrl } from '@/lib/asset-url'
import { apiBaseUrl } from '@/lib/api'

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
  { value: 'newest', label: 'Новые' },
  { value: 'oldest', label: 'Старые' },
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
  { value: 'popular', label: 'Популярные' },
]

const MEDIA_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'IMAGE_2D', label: '2D' },
  { value: 'MODEL_3D', label: '3D' },
]

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
      const res = await fetch(`${apiBaseUrl}/api/artworks?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchArtworks(mediaFilter, sort, search) }, [mediaFilter, sort, search, fetchArtworks])

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>

      <GalleryHeader
        title="Галерея"
        subtitle="Кураторская подборка независимых художников"
        count={total > 0 ? total : undefined}
      />

      {/* Filters — layout-only container, visual styling lives in FilterTab / SearchField */}
      <div
        className="flex items-stretch border-b border-border mb-12"
        style={{ gap: 0 }}
      >
        <div className="flex border-r border-border pr-4 mr-4">
          {MEDIA_FILTERS.map((m) => (
            <FilterTab
              key={m.value}
              active={mediaFilter === m.value}
              onClick={() => setMediaFilter(m.value)}
            >
              {m.label}
            </FilterTab>
          ))}
        </div>

        <div className="flex">
          {SORT_OPTIONS.map((s) => (
            <FilterTab
              key={s.value}
              active={sort === s.value}
              onClick={() => setSort(s.value)}
            >
              {s.label}
            </FilterTab>
          ))}
        </div>

        <div className="ml-auto flex items-center pb-3">
          <SearchField
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Поиск..."
            aria-label="Поиск работ"
          />
        </div>
      </div>

      {/* Grid */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px 24px',
            paddingBottom: '96px',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => <ArtworkCardSkeleton key={i} />)}
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '96px 0' }}>
          <p
            style={{
              fontFamily: 'var(--font-editorial)',
              fontStyle: 'italic',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
            }}
          >
            Не удалось загрузить галерею
          </p>
          <button
            onClick={() => fetchArtworks(mediaFilter, sort, search)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              padding: '10px 24px',
              cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}

      {!loading && !error && artworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '96px 0' }}>
          <p
            style={{
              fontFamily: 'var(--font-editorial)',
              fontStyle: 'italic',
              fontSize: '1.5rem',
              color: 'var(--text-muted)',
            }}
          >
            Ничего не найдено
          </p>
        </div>
      )}

      {!loading && !error && artworks.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px 24px',
            paddingBottom: '96px',
          }}
        >
          {artworks.map((aw, i) => (
            <RevealOnScroll key={aw.id} direction="up" delay={i * 40}>
              <ArtworkCard
                id={aw.id}
                title={aw.title}
                artistName={aw.artist.displayName ?? 'Неизвестный художник'}
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
