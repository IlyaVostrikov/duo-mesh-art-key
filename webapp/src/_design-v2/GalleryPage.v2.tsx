/*
  DESIGN V2 — GalleryPage
  Заменяет: src/pages/gallery/GalleryPage.tsx

  Изменения:
  - Только русский язык
  - Нативный <select> → таб-кнопки для сортировки (единообразие)
  - Убрана inline-стилизация в пользу переменных токенов
  - Hero-заголовок: Cormorant editorial
  - Фильтры: строгая горизонтальная полоска с разделителями
  - Сетка: minmax(260px) — чуть крупнее карточки
  - Пустое состояние: минималистичное
*/
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
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

const filterBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 14px',
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  fontFamily: 'var(--font-sans)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: active ? 'var(--text)' : 'var(--text-muted)',
  borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
  transition: 'color 150ms, border-color 150ms',
  paddingBottom: '12px',
})

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

      {/* Hero */}
      <header style={{ padding: '64px 0 48px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '24px',
            marginBottom: '0',
          }}
        >
          <div>
            <h1 className="text-editorial" style={{ margin: 0, color: 'var(--text)' }}>
              Галерея
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                marginTop: '8px',
                margin: '8px 0 0',
              }}
            >
              Кураторская подборка независимых художников
            </p>
          </div>
          {total > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}
            >
              {total} {total === 1 ? 'работа' : total < 5 ? 'работы' : 'работ'}
            </span>
          )}
        </div>
      </header>

      {/* Фильтры */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '0',
          borderBottom: '1px solid var(--border)',
          marginBottom: '48px',
        }}
      >
        {/* Медиа-фильтр */}
        <div style={{ display: 'flex', borderRight: '1px solid var(--border)', paddingRight: '16px', marginRight: '16px' }}>
          {MEDIA_FILTERS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMediaFilter(m.value)}
              style={filterBtnStyle(mediaFilter === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Сортировка */}
        <div style={{ display: 'flex' }}>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              style={filterBtnStyle(sort === s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Поиск */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingBottom: '12px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск..."
            aria-label="Поиск работ"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              padding: '4px 8px',
              outline: 'none',
              width: '200px',
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => { e.target.style.borderBottomColor = 'var(--accent)' }}
            onBlur={(e) => { e.target.style.borderBottomColor = 'var(--border)' }}
          />
        </div>
      </div>

      {/* Сетка */}
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
