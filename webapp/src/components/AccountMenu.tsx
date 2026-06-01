import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { UserAvatar } from '@/components/ui/user-avatar'
import { apiBaseUrl } from '@/lib/api'
import { ROLE_LABELS } from '@/lib/labels'

export function AccountMenu() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hallSlug, setHallSlug] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const user = auth.user

  useEffect(() => {
    if (!user || user.role !== 'ARTIST' || !auth.accessToken) return
    let cancelled = false
    fetch(`${apiBaseUrl}/api/artists/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const artist = await r.json()
        if (!cancelled && artist.hall?.slug) setHallSlug(artist.hall.slug)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, auth.accessToken])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  if (!user) return null

  const handleLogout = async () => {
    setOpen(false)
    await auth.logout()
    navigate({ to: '/' })
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          borderRadius: 'var(--radius-sm)',
          transition: 'box-shadow 0.15s',
          boxShadow: open ? '0 0 0 2px var(--accent)' : 'none',
        }}
      >
        <UserAvatar userId={user.id} displayName={user.displayName} email={user.email} size={36} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 280,
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s var(--ease) both',
          }}
        >
          {/* User info */}
          <div
            className="flex items-center gap-3 p-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <UserAvatar userId={user.id} displayName={user.displayName} email={user.email} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {user.displayName ?? user.email}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </p>
              <span
                className="inline-block text-xs mt-1 px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(var(--accent-rgb),0.08)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(var(--accent-rgb),0.2)',
                }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {/* Menu links */}
          <div className="py-2">
            <MenuItem onClick={() => { setOpen(false); navigate({ to: '/dashboard' }) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Дашборд / Dashboard
            </MenuItem>

            {user.role === 'ARTIST' && (
              <MenuItem onClick={() => { setOpen(false); navigate({ to: '/dashboard/artworks' }) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                Мои работы / My Works
              </MenuItem>
            )}

            {user.role === 'ARTIST' && hallSlug && (
              <MenuItem onClick={() => { setOpen(false); navigate({ to: '/hall/$hallSlug', params: { hallSlug } }) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Мой зал / My Hall
              </MenuItem>
            )}

            {user.role === 'ARTIST' && !hallSlug && (
              <MenuItem onClick={() => { setOpen(false); navigate({ to: '/onboarding/artist' }) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Создать зал / Create Hall
              </MenuItem>
            )}

            {user.role === 'ADMIN' && (
              <MenuItem onClick={() => { setOpen(false); navigate({ to: '/admin' }) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                Админ-панель / Admin
              </MenuItem>
            )}

            <MenuItem onClick={() => { setOpen(false); navigate({ to: '/dashboard/settings' }) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Настройки / Settings
            </MenuItem>
          </div>

          {/* Logout */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
              style={{
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Выйти / Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
      style={{
        color: 'var(--text)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {children}
    </button>
  )
}
