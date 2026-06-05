import { useState, useEffect, useCallback } from 'react'
import { ArtistCard } from '@/components/artist/ArtistCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { apiBaseUrl } from '@/lib/api'

interface ArtistItem {
  id: string
  displayName: string | null
  location: string | null
  verified: boolean
  artistStatement: string | null
  avatarUrl: string | null
  followersCount: number
  isFollowed?: boolean
  hall: { slug: string; title: string; coverImageUrl: string | null; isPublished: boolean } | null
}

interface ArtistsResponse {
  artists: ArtistItem[]
  total: number
  page: number
  pageSize: number
}

export function ArtistsIndexPage() {
  const [artists, setArtists] = useState<ArtistItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchArtists = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/artists?page=${p}&pageSize=${pageSize}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ArtistsResponse = await res.json()
      setArtists(data.artists)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchArtists(page) }, [fetchArtists, page])

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
        <div className="mb-12">
          <div className="h-10 w-64 bg-[var(--surface)] rounded animate-pulse mb-2" />
          <div className="h-5 w-48 bg-[var(--surface)] rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-xl animate-pulse"
              style={{ aspectRatio: '3/2', animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 className="text-display-sm mb-2">Ошибка загрузки / Load error</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => fetchArtists(page)}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Попробовать снова / Try again
        </button>
      </section>
    )
  }

  if (artists.length === 0) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 className="text-display-sm mb-2">
          Художники / Artists
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Пока нет зарегистрированных художников / No registered artists yet
        </p>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
      <div className="border-b border-border pb-6 mb-12">
        <h1 className="text-display-sm mb-1">
          Художники / Artists
        </h1>
        <div className="flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            {total === 1
              ? '1 художник / 1 artist'
              : total < 5
                ? `${total} художника / ${total} artists`
                : `${total} художников / ${total} artists`}
          </p>
          <button
            onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
            className="text-xs font-medium px-2 py-0.5 rounded cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {artists.map((a, i) => (
          <RevealOnScroll key={a.id} direction="up" delay={i * 60}>
            <ArtistCard
              id={a.id}
              displayName={a.displayName}
              location={a.location}
              verified={a.verified}
              artistStatement={a.artistStatement}
              avatarUrl={a.avatarUrl}
              followersCount={a.followersCount}
              isFollowed={a.isFollowed}
              hall={a.hall}
              lang={lang}
            />
          </RevealOnScroll>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '8px 16px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: page <= 1 ? 'var(--surface)' : 'transparent',
              color: page <= 1 ? 'var(--text-muted)' : 'var(--text)',
              cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            ← {lang === 'ru' ? 'Назад' : 'Prev'}
          </button>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: '8px 16px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: page >= totalPages ? 'var(--surface)' : 'transparent',
              color: page >= totalPages ? 'var(--text-muted)' : 'var(--text)',
              cursor: page >= totalPages ? 'default' : 'pointer',
            }}
          >
            {lang === 'ru' ? 'Вперёд' : 'Next'} →
          </button>
        </div>
      )}
    </section>
  )
}
