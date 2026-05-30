import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { assetUrl } from '@/lib/asset-url'

interface PurchasedArtwork {
  id: string
  title: string
  posterUrl: string
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  category: string
  status: string
  price: string | null
  currency: string
  purchasePrice: string
  purchasedAt: string
  artist: {
    id: string
    displayName: string | null
    hallSlug: string | null
  }
  artKey: { keyCode: string } | null
}

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export function CollectionPage() {
  const auth = useAuth()
  const [artworks, setArtworks] = useState<PurchasedArtwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollection = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/sales/me`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  // Not logged in
  if (!auth.accessToken) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-hero" style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
            Моя коллекция / My Collection
          </h1>
        </RevealOnScroll>
        <RevealOnScroll direction="up" delay={80}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
            Войдите, чтобы увидеть коллекцию / Log in to see your collection.
          </p>
        </RevealOnScroll>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <h1 className="text-display-hero" style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
          Моя коллекция / My Collection
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={80}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '32px', lineHeight: 1.6 }}>
          {artworks.length > 0 ? (
            <>
              <AnimatedCounter value={artworks.length} />{' '}
              {artworks.length === 1 ? 'работа / work' : artworks.length < 5 ? 'работы / works' : 'работ / works'}
            </>
          ) : (
            'Приобретённые работы и сертификаты ArtKey / Acquired artworks and ArtKey certificates'
          )}
        </p>
      </RevealOnScroll>

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '48px 24px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)',
              height: '360px',
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
            Не удалось загрузить коллекцию / Failed to load collection
          </p>
          <button onClick={fetchCollection} style={{
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
          <div style={{
            textAlign: 'center', padding: '64px 0',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '16px' }}>
              Коллекция пока пуста / Your collection is empty
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Приобретённые работы появятся здесь после первой покупки /<br />
              Acquired artworks will appear here after your first purchase.
            </p>
            <Link to="/gallery" style={{
              display: 'inline-block', padding: '10px 24px',
              backgroundColor: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem',
            }}>
              Открыть галерею / Browse Gallery
            </Link>
          </div>
        </RevealOnScroll>
      )}

      {/* Artwork grid */}
      {!loading && !error && artworks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '48px 24px',
          paddingBottom: '96px',
        }}>
          {artworks.map((aw, i) => (
            <div key={aw.id}>
              <RevealOnScroll direction="up" delay={i * 60}>
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
                {/* ArtKey badge */}
                {aw.artKey && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--accent)',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    ArtKey {aw.artKey.keyCode}
                  </div>
                )}
                <div style={{
                  marginTop: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}>
                  Приобретено / Purchased: {new Date(aw.purchasedAt).toLocaleDateString('ru-RU')}
                </div>
              </RevealOnScroll>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
