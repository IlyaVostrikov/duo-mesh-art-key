/*
  DESIGN V2 — RootLayout (pages.tsx → RootLayout)
  Заменяет: src/pages.tsx — только компонент RootLayout

  Изменения:
  - Убраны двуязычные метки ("Галерея / Gallery" → "Галерея")
  - Nav-ссылки: только текст, без button-variant обёртки — чище
  - Логотип: Unbounded + тонкая линия-разделитель
  - Header: фиксированная высота 56px, строгий border-bottom всегда
  - Убран backdrop-blur на scrolled — он мерцал на некоторых GPU
*/
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { AccountMenu } from '@/components/AccountMenu'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { PageTransition } from '@/components/motion/PageTransition'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { useAuth } from '@/lib/use-auth'
import { useCallback, useEffect, useState } from 'react'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

const navLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  textDecoration: 'none',
  transition: 'color 150ms',
  padding: '4px 0',
}

function useIsActive(path: string) {
  const loc = useLocation()
  return loc.pathname.startsWith(path)
}

export function RootLayout() {
  const auth = useAuth()

  return (
    <main style={{ minHeight: '100svh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 20px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '0',
          }}
        >
          {/* Логотип */}
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              color: 'var(--text)',
              textDecoration: 'none',
              marginRight: '40px',
            }}
          >
            DUO MESH
          </Link>

          {/* Разделитель */}
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'var(--border)',
              marginRight: '32px',
            }}
          />

          {/* Навигация */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <NavLink to="/gallery" label="Галерея" />
            <NavLink to="/verify" label="ArtKey" />
          </nav>

          {/* Правая часть */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '24px' }}>
            {auth.isAuthenticated ? (
              <AccountMenu />
            ) : (
              <Link
                to="/login"
                style={{
                  ...navLinkStyle,
                  color: 'var(--text)',
                  fontWeight: 500,
                }}
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      <PageTransition>
        <Outlet />
      </PageTransition>
    </main>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation()
  const isActive = loc.pathname.startsWith(to)

  return (
    <Link
      to={to}
      style={{
        ...navLinkStyle,
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        borderBottom: isActive ? '1px solid var(--accent)' : '1px solid transparent',
        paddingBottom: '2px',
      }}
    >
      {label}
    </Link>
  )
}

export function LoadingState() {
  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <Card style={{ width: 'fit-content' }}>
        <CardContent style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Spinner />
          <Typography variant="bodySm" tone="muted">Загрузка...</Typography>
        </CardContent>
      </Card>
    </section>
  )
}

export function AppPage() {
  const auth = useAuth()

  if (auth.isBootstrapping) return <LoadingState />

  if (!auth.user) {
    return (
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
        <Typography variant="h2">Войдите в аккаунт</Typography>
        <Typography tone="muted">Для доступа к этой странице необходима авторизация.</Typography>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <Typography variant="h1" className="mb-1">
          {auth.user.displayName ?? auth.user.email}
        </Typography>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={60}>
        <Typography tone="muted" className="mb-8">{auth.user.email}</Typography>
      </RevealOnScroll>
      {auth.user.role === 'ARTIST'
        ? <ArtistHub accessToken={auth.accessToken} />
        : <CollectorHub />}
    </section>
  )
}

function ArtistHub({ accessToken }: { accessToken: string | null }) {
  const [stats, setStats] = useState<{ artworks: number; halls: number; sales: number } | null>(null)

  const fetchStats = useCallback(async () => {
    if (!accessToken) return
    try {
      const [artistRes, salesRes] = await Promise.all([
        fetch(`${API_BASE}/api/artists/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${API_BASE}/api/sales/artist`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const artist = artistRes.ok ? await artistRes.json() : null
      const sales = salesRes.ok ? await salesRes.json() : null
      setStats({
        artworks: artist?.totalSalesCount ?? 0,
        halls: artist?.hall ? 1 : 0,
        sales: sales?.total ?? 0,
      })
    } catch { /* stats are non-critical */ }
  }, [accessToken])

  useEffect(() => { fetchStats() }, [fetchStats])

  const links = [
    { to: '/dashboard/artworks', title: 'Мои работы', desc: 'Управление произведениями', stat: stats?.artworks, statLabel: 'работ' },
    { to: '/dashboard/hall', title: 'Выставочный зал', desc: 'Настройка виртуальной галереи' },
    { to: '/dashboard/sales', title: 'Продажи', desc: 'История и статистика', stat: stats?.sales, statLabel: 'продаж' },
    { to: '/dashboard/settings', title: 'Профиль', desc: 'Statement, контакты, ссылки' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--border)', marginTop: '48px' }}>
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          style={{ textDecoration: 'none', background: 'var(--bg)', display: 'block' }}
        >
          <div
            className="group"
            style={{ padding: '32px', transition: 'background 200ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
          >
            <Typography variant="h6" style={{ marginBottom: '6px' }}>{link.title}</Typography>
            <Typography variant="bodySm" tone="muted">{link.desc}</Typography>
            {link.stat !== undefined && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '16px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <AnimatedCounter value={link.stat} />
                </span>
                <Typography variant="bodySm" tone="muted">{link.statLabel}</Typography>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

function CollectorHub() {
  const links = [
    { to: '/collection', title: 'Моя коллекция', desc: 'Приобретённые работы и сертификаты ArtKey' },
    { to: '/collection/saved', title: 'Сохранённое', desc: 'Избранные работы для просмотра' },
    { to: '/following', title: 'Подписки', desc: 'Отслеживаемые художники' },
    { to: '/dashboard/settings', title: 'Профиль', desc: 'Персональные настройки' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--border)', marginTop: '48px' }}>
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          style={{ textDecoration: 'none', background: 'var(--bg)', display: 'block' }}
        >
          <div
            style={{ padding: '32px', transition: 'background 200ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
          >
            <Typography variant="h6" style={{ marginBottom: '6px' }}>{link.title}</Typography>
            <Typography variant="bodySm" tone="muted">{link.desc}</Typography>
          </div>
        </Link>
      ))}
    </div>
  )
}
