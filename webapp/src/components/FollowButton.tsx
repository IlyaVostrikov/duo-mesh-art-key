import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Spinner } from '@/components/ui/spinner'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

interface FollowButtonProps {
  artistId: string
  initialIsFollowing?: boolean
  initialCount?: number
  size?: 'sm' | 'md'
}

export function FollowButton({
  artistId,
  initialIsFollowing = false,
  initialCount = 0,
  size = 'md',
}: FollowButtonProps) {
  const auth = useAuth()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  // Sync if initial values arrive late
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
    setCount(initialCount)
  }, [initialIsFollowing, initialCount])

  const handleToggle = useCallback(async () => {
    if (!auth.accessToken || pending) return
    setPending(true)
    const prevFollowing = isFollowing
    const prevCount = count

    // Optimistic update
    setIsFollowing(!prevFollowing)
    setCount((c) => (prevFollowing ? c - 1 : c + 1))

    try {
      const res = await fetch(`${API_BASE}/api/follows/${artistId}`, {
        method: prevFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCount(data.followersCount)
    } catch {
      // Revert
      setIsFollowing(prevFollowing)
      setCount(prevCount)
    } finally {
      setPending(false)
    }
  }, [artistId, auth.accessToken, isFollowing, count, pending])

  const classes = {
    sm: { padding: '4px 12px', fontSize: '0.75rem', gap: '6px' },
    md: { padding: '6px 16px', fontSize: '0.8125rem', gap: '8px' },
  }[size]

  return (
    <button
      onClick={handleToggle}
      disabled={pending || !auth.accessToken}
      className="group"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: classes.gap,
        padding: classes.padding,
        fontSize: classes.fontSize,
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isFollowing ? 'var(--accent)' : 'var(--border)'}`,
        backgroundColor: isFollowing ? 'rgba(198,255,58,0.06)' : 'transparent',
        color: isFollowing ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: pending || !auth.accessToken ? 'default' : 'pointer',
        opacity: pending ? 0.7 : 1,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        if (pending || !auth.accessToken) return
        if (isFollowing) {
          e.currentTarget.style.borderColor = 'var(--destructive)'
          e.currentTarget.style.color = 'var(--destructive)'
          e.currentTarget.style.backgroundColor = 'rgba(255,60,60,0.06)'
        } else {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.backgroundColor = 'rgba(198,255,58,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isFollowing ? 'var(--accent)' : 'var(--border)'
        e.currentTarget.style.color = isFollowing ? 'var(--accent)' : 'var(--text-secondary)'
        e.currentTarget.style.backgroundColor = isFollowing ? 'rgba(198,255,58,0.06)' : 'transparent'
      }}
      title={
        !auth.accessToken
          ? 'Войдите, чтобы подписаться / Log in to follow'
          : isFollowing
            ? 'Отписаться / Unfollow'
            : 'Подписаться / Follow'
      }
    >
      {pending ? (
        <Spinner />
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={isFollowing ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
      {isFollowing ? 'Вы подписаны / Following' : 'Подписаться / Follow'}
      {count > 0 && (
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
          {count}
        </span>
      )}
    </button>
  )
}
