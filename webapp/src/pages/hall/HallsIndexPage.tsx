import { useState, useEffect, useCallback } from 'react'
import { HallCard } from '@/components/hall/HallCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { apiBaseUrl } from '@/lib/api'
import { coerceTheme } from '@/lib/utils'

interface HallItem {
  slug: string
  title: string
  coverImageUrl: string | null
  viewCount: number
  artworkCount: number
  theme: string | null
  artist: { id: string; displayName: string | null; avatarUrl: string | null }
}

export function HallsIndexPage() {
  const [halls, setHalls] = useState<HallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  const fetchHalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/halls`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHalls(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHalls() }, [fetchHalls])

  if (loading) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
        <div className="mb-12">
          <div className="h-10 w-64 bg-[var(--surface)] rounded animate-pulse mb-2" />
          <div className="h-5 w-48 bg-[var(--surface)] rounded animate-pulse" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] rounded-xl animate-pulse"
              style={{ aspectRatio: '4/3', animationDelay: `${i * 80}ms` }}
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
          onClick={fetchHalls}
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

  if (halls.length === 0) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 className="text-display-sm mb-2">
          Залы / Halls
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Пока нет опубликованных залов / No published halls yet
        </p>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
      <div className="border-b border-border pb-6 mb-12">
        <h1 className="text-display-sm mb-1">
          Выставочные залы / Exhibition Halls
        </h1>
        <div className="flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            {halls.length === 1
              ? '1 зал / 1 hall'
              : halls.length < 5
                ? `${halls.length} зала / ${halls.length} halls`
                : `${halls.length} залов / ${halls.length} halls`}
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {halls.map((h, i) => (
          <RevealOnScroll key={h.slug} direction="up" delay={i * 60}>
            <HallCard
              slug={h.slug}
              title={h.title}
              coverImageUrl={h.coverImageUrl}
              viewCount={h.viewCount}
              artworkCount={h.artworkCount}
              theme={coerceTheme(h.theme)}
              artist={h.artist}
              lang={lang}
            />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}
