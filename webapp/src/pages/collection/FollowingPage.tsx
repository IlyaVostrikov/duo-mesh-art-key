import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { apiBaseUrl } from '@/lib/api'

interface FollowedArtist {
  id: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  hall: { slug: string; title: string; coverImageUrl: string | null; isPublished: boolean } | null
  followersCount: number
  isFollowing: boolean
  followedAt: string
}

export function FollowingPage() {
  const auth = useAuth()
  const [artists, setArtists] = useState<FollowedArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowing = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/follows`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtists(data.artists ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken])

  useEffect(() => {
    fetchFollowing()
  }, [fetchFollowing])

  const handleUnfollow = async (artistId: string) => {
    if (!auth.accessToken) return
    // Optimistic remove
    setArtists((prev) => prev.filter((a) => a.id !== artistId))
    try {
      await fetch(`${apiBaseUrl}/api/follows/${artistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
    } catch {
      // Revert on failure
      fetchFollowing()
    }
  }

  // Not logged in
  if (!auth.accessToken) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-hero" style={{ marginBottom: '16px' }}>
            Подписки / Following
          </h1>
        </RevealOnScroll>
        <RevealOnScroll direction="up" delay={80}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
            Войдите, чтобы увидеть подписки / Log in to see your followed artists.
          </p>
        </RevealOnScroll>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <h1 className="text-display-hero" style={{ marginBottom: '8px' }}>
          Подписки / Following
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={80}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '32px', lineHeight: 1.6 }}>
          {artists.length > 0 ? (
            <>
              <AnimatedCounter value={artists.length} />{' '}
              {artists.length === 1 ? 'художник / artist' : artists.length < 5 ? 'художника / artists' : 'художников / artists'}
            </>
          ) : (
            'Отслеживаемые художники / Followed artists'
          )}
        </p>
      </RevealOnScroll>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '140px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--surface)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Не удалось загрузить / Failed to load
          </p>
          <button
            onClick={fetchFollowing}
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Повторить / Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && artists.length === 0 && (
        <RevealOnScroll direction="up" delay={120}>
          <div
            style={{
              textAlign: 'center',
              padding: '64px 0',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '16px' }}>
              Вы пока ни на кого не подписаны / You aren&apos;t following anyone yet
            </p>
            <Link
              to="/gallery"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Открыть галерею / Browse Gallery
            </Link>
          </div>
        </RevealOnScroll>
      )}

      {/* Artist cards */}
      {!loading && !error && artists.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {artists.map((artist, i) => (
            <RevealOnScroll key={artist.id} direction="up" delay={i * 50}>
              <div
                className="group"
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(198,255,58,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-2)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                  }}
                >
                  {artist.avatarUrl ? (
                    <img
                      src={artist.avatarUrl}
                      alt={artist.displayName ?? ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (artist.displayName ?? '?').charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px' }}>
                        {artist.displayName ?? 'Unknown Artist'}
                      </h3>
                      {artist.hall && (
                        <Link
                          to="/hall/$hallSlug"
                          params={{ hallSlug: artist.hall.slug }}
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                          }}
                        >
                          {artist.hall.title}
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnfollow(artist.id)
                      }}
                      className="text-xs"
                      style={{
                        padding: '4px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontSize: '0.75rem',
                        transition: 'all 0.2s var(--ease)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--destructive)'
                        e.currentTarget.style.color = 'var(--destructive)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      Отписаться / Unfollow
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {artist.followersCount} {artist.followersCount === 1 ? 'подписчик / follower' : artist.followersCount < 5 ? 'подписчика / followers' : 'подписчиков / followers'}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </section>
  )
}
