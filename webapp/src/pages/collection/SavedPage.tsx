import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { SaveButton } from '@/components/SaveButton'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { assetUrl } from '@/lib/asset-url'
import type { ArtworkPublicDto } from '@duo-mesh/contracts'

export function SavedPage() {
  const auth = useAuth()
  const [artworks, setArtworks] = useState<ArtworkPublicDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSaved = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const data = await auth.api.listSaved()
      setArtworks(data.artworks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken, auth.api])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  // Not logged in
  if (!auth.accessToken) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-hero" style={{ marginBottom: '16px' }}>
            Сохранённое / Saved
          </h1>
        </RevealOnScroll>
        <RevealOnScroll direction="up" delay={80}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
            Войдите, чтобы увидеть сохранённое / Log in to see your saved artworks.
          </p>
        </RevealOnScroll>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <h1 className="text-display-hero" style={{ marginBottom: '8px' }}>
          Сохранённое / Saved
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={80}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '32px', lineHeight: 1.6 }}>
          {artworks.length > 0
            ? `${artworks.length} ${artworks.length === 1 ? 'работа / work' : artworks.length < 5 ? 'работы / works' : 'работ / works'}`
            : 'Закладки с понравившимися работами / Artworks you saved'}
        </p>
      </RevealOnScroll>

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px 24px',
          paddingBottom: '96px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)',
              aspectRatio: '4/5',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 120}ms`,
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Не удалось загрузить сохранённое / Failed to load saved artworks
          </p>
          <button onClick={fetchSaved} style={{
            padding: '8px 20px', backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
            border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 500,
          }}>
            Повторить / Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && artworks.length === 0 && (
        <RevealOnScroll direction="up" delay={120}>
          <div
            style={{
              maxWidth: '600px',
              padding: '48px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              textAlign: 'center',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: '64px', height: '64px', margin: '0 auto 20px', borderRadius: '50%',
                backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
              Пока ничего нет / Nothing here yet
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Сохраняйте понравившиеся работы из галереи — они появятся здесь.
              <br />
              Save artworks you like from the gallery — they will appear here.
            </p>
            <Link
              to="/gallery"
              style={{
                display: 'inline-block', padding: '10px 24px',
                backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
                borderRadius: 'var(--radius)', textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              В галерею / To Gallery
            </Link>
          </div>
        </RevealOnScroll>
      )}

      {/* Artwork grid */}
      {!loading && !error && artworks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px 24px',
          paddingBottom: '96px',
        }}>
          {artworks.map((aw, i) => (
            <RevealOnScroll key={aw.id} direction="up" delay={i * 40}>
              <div style={{ position: 'relative' }}>
                <ArtworkCard
                  id={aw.id}
                  title={aw.title}
                  artistName={aw.artist?.displayName ?? 'Неизвестный художник'}
                  posterUrl={assetUrl(aw.posterUrl)}
                  mediaType={aw.mediaType}
                  price={aw.price}
                  currency={aw.currency}
                  status={aw.status}
                />
                <SaveButton
                  artworkId={aw.id}
                  initialSaved
                  style={{ position: 'absolute', bottom: '10px', right: '10px' }}
                  onToggle={(saved) => {
                    if (!saved) setArtworks((prev) => prev.filter((a) => a.id !== aw.id))
                  }}
                />
              </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </section>
  )
}
