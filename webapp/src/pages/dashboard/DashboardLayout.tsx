import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

const ARTIST_NAV = [
  { to: '/dashboard', label: 'Обзор / Overview', exact: true },
  { to: '/dashboard/artworks', label: 'Работы / Artworks' },
  { to: '/dashboard/hall', label: 'Зал / Hall' },
  { to: '/dashboard/hall/layout', label: 'Раскладка 3D / Layout' },
  { to: '/dashboard/settings', label: 'Профиль / Settings' },
  { to: '/dashboard/sales', label: 'Продажи / Sales' },
]

const COLLECTOR_NAV = [
  { to: '/dashboard', label: 'Обзор / Overview', exact: true },
  { to: '/dashboard/settings', label: 'Профиль / Settings' },
]

const GUEST_NAV = [
  { to: '/dashboard', label: 'Обзор / Overview', exact: true },
  { to: '/dashboard/settings', label: 'Профиль / Settings' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const loc = useLocation()
  const [hallSlug, setHallSlug] = useState<string | null>(null)

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return loc.pathname === path
    return loc.pathname.startsWith(path)
  }

  useEffect(() => {
    if (auth.user?.role !== 'ARTIST' || !auth.accessToken) return
    let cancelled = false
    fetch(`${API_BASE}/api/artists/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const artist = await r.json()
        if (!cancelled && artist.hall?.slug) setHallSlug(artist.hall.slug)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [auth.user?.role, auth.accessToken])

  if (auth.isBootstrapping) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-12">
        <Card className="w-fit mx-auto">
          <CardContent className="flex items-center gap-3">
            <Spinner />
            <Typography variant="bodySm" tone="muted">
              Загрузка... / Loading...
            </Typography>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!auth.user) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-12 text-center">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Войдите в аккаунт / Log in</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Войдите, чтобы получить доступ к дашборду / Log in to access your dashboard.
        </p>
      </section>
    )
  }

  const navItems = auth.user.role === 'ARTIST' ? ARTIST_NAV
    : auth.user.role === 'COLLECTOR' ? COLLECTOR_NAV
    : GUEST_NAV

  return (
    <div className="flex" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        className="flex-shrink-0"
        style={{
          width: '220px',
          paddingTop: '48px',
          paddingRight: '32px',
          borderRight: '1px solid var(--border)',
        }}
      >
        <Link to="/" className="block mb-8 text-sm" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Галерея / Gallery
        </Link>
        <ul className="space-y-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="block px-3 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius)',
                  color: isActive(item.to, item.exact) ? 'var(--text)' : 'var(--text-muted)',
                  backgroundColor: isActive(item.to, item.exact) ? 'var(--surface)' : 'transparent',
                  textDecoration: 'none',
                  transition: `background-color var(--dur-fast) var(--ease)`,
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
          {hallSlug && (
            <li style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <Link
                to="/hall/$hallSlug"
                params={{ hallSlug }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius)',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Смотреть зал / View Hall
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Content */}
      <main className="flex-1" style={{ paddingTop: '48px', paddingLeft: '48px', paddingBottom: '96px' }}>
        <RevealOnScroll direction="up">
          {children}
        </RevealOnScroll>
      </main>
    </div>
  )
}
