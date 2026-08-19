import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Spinner } from '@/components/ui/spinner'

interface SaveButtonProps {
  artworkId: string
  initialSaved?: boolean
  size?: 'sm' | 'md'
  style?: CSSProperties
  className?: string
  onToggle?: (saved: boolean) => void
}

export function SaveButton({
  artworkId,
  initialSaved,
  size = 'sm',
  style,
  className,
  onToggle,
}: SaveButtonProps) {
  const auth = useAuth()
  const [saved, setSaved] = useState(initialSaved ?? false)
  const [pending, setPending] = useState(false)

  // The gallery list is public and doesn't carry per-user save state, so fetch it
  // lazily. When the caller already knows the state (e.g. the Saved page), skip.
  useEffect(() => {
    if (initialSaved !== undefined || !auth.accessToken) return
    let cancelled = false
    auth.api.getSaveStatus(artworkId)
      .then((data) => {
        if (!cancelled) setSaved(data.saved)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [artworkId, auth.accessToken, auth.api, initialSaved])

  const handleToggle = useCallback(async () => {
    if (!auth.accessToken || pending) return
    setPending(true)
    const prevSaved = saved
    setSaved(!prevSaved)
    try {
      const data = prevSaved
        ? await auth.api.unsaveArtwork(artworkId)
        : await auth.api.saveArtwork(artworkId)
      setSaved(data.saved)
      onToggle?.(data.saved)
    } catch {
      setSaved(prevSaved)
    } finally {
      setPending(false)
    }
  }, [artworkId, auth.accessToken, auth.api, saved, pending, onToggle])

  // The collection routes only allow COLLECTOR/ADMIN to save. Hide the button
  // for other authenticated roles rather than showing a button that 403s.
  if (auth.accessToken && auth.user?.role !== 'COLLECTOR' && auth.user?.role !== 'ADMIN') {
    return null
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending || !auth.accessToken}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: size === 'sm' ? '7px' : '9px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        backgroundColor: saved ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(11,11,13,0.55)',
        color: saved ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: pending || !auth.accessToken ? 'default' : 'pointer',
        opacity: pending ? 0.7 : 1,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
      title={
        !auth.accessToken
          ? 'Войдите, чтобы сохранить / Log in to save'
          : saved
            ? 'Убрать из сохранённого / Remove from saved'
            : 'Сохранить / Save'
      }
      aria-label={saved ? 'Убрать из сохранённого' : 'Сохранить'}
      aria-pressed={saved}
    >
      {pending ? (
        <Spinner />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )
}
