/*
  DESIGN V2 — RootLayout + AppPage + CollectorHub + ArtistHub
  Заменяет: src/pages.tsx

  Изменения:
  - Логотип: Unbounded (font-brand) — остаётся уникальной маркой
  - Навигация: Figtree, только русский язык, accent underline для active
  - Header: чёткий border-bottom всегда, blur убран
  - Dashboard hub: grid-таблица (стиль galerie-menu) вместо card-компонентов
  - Текст: только русский язык
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
import { apiBaseUrl } from '@/lib/api'

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation()
  const isActive = loc.pathname.startsWith(to)
  return (
    <Link
      to={to}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.82rem',
        fontWeight: isActive ? 600 : 400,
        letterSpacing: '-0.01em',
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        textDecoration: 'none',
        paddingBottom: '3px',
        borderBottom: isActive ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'color 150ms, border-color 150ms',
      }}
    >
      {label}
    </Link>
  )
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
            gap: '32px',
          }}
        >
          {/* Бренд-марка: Unbounded */}
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              color: 'var(--text)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            DUO MESH
          </Link>

          {/* Разделитель */}
          <div style={{ width: '1px', height: '14px', background: 'var(--border)' }} />

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <NavLink to="/gallery" label="Галерея" />
            <NavLink to="/verify" label="ArtKey" />
          </nav>

          {/* Правая часть */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {auth.isAuthenticated ? (
              <AccountMenu />
            ) : (
              <Link
                to="/login"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--text)',
                  textDecoration: 'none',
                  transition: 'color 150ms',
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
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
      {/* Заголовок профиля */}
      <RevealOnScroll direction="up">
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '48px' }}>
          <h1
            className="text-display-sm"
            style={{ fontFamily: 'var(--font-display)', margin: '0 0 4px' }}
          >
            {auth.user.displayName ?? auth.user.email}
          </h1>
          <Typography tone="muted" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
            {auth.user.email}
          </Typography>
        </div>
      </RevealOnScroll>

      {auth.user.role === 'ARTIST'
        ? <ArtistHub accessToken={auth.accessToken} />
        : <CollectorHub />}
    </section>
  )
}

function ArtistHub({ accessToken }: { accessToken: string | null }) {
  const [stats, setStats] = useState<{ artworks: number; sales: number } | null>(null)

  const fetchStats = useCallback(async () => {
    if (!accessToken) return
    try {
      const [artistRes, salesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/artists/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${apiBaseUrl}/api/sales/artist`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const artist = artistRes.ok ? await artistRes.json() : null
      const sales = salesRes.ok ? await salesRes.json() : null
      setStats({ artworks: artist?.totalSalesCount ?? 0, sales: sales?.total ?? 0 })
    } catch { /* non-critical */ }
  }, [accessToken])

  useEffect(() => { fetchStats() }, [fetchStats])

  const links = [
    { to: '/dashboard/artworks', title: 'Мои работы',       desc: 'Управление произведениями',           stat: stats?.artworks, statLabel: 'работ' },
    { to: '/dashboard/hall',     title: 'Выставочный зал',  desc: 'Настройка виртуальной галереи' },
    { to: '/dashboard/sales',    title: 'Продажи',          desc: 'История и статистика',                stat: stats?.sales,    statLabel: 'продаж' },
    { to: '/dashboard/settings', title: 'Профиль',          desc: 'Statement, контакты, ссылки' },
  ]

  return <HubGrid links={links} />
}

function CollectorHub() {
  const links = [
    { to: '/collection',          title: 'Моя коллекция', desc: 'Приобретённые работы и сертификаты ArtKey' },
    { to: '/collection/saved',    title: 'Сохранённое',   desc: 'Избранные работы для просмотра' },
    { to: '/following',           title: 'Подписки',      desc: 'Отслеживаемые художники' },
    { to: '/dashboard/settings',  title: 'Профиль',       desc: 'Персональные настройки' },
  ]
  return <HubGrid links={links} />
}

function HubGrid({
  links,
}: {
  links: { to: string; title: string; desc: string; stat?: number; statLabel?: string }[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1px',
        background: 'var(--border)',
      }}
    >
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
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
                margin: '0 0 6px',
              }}
            >
              {link.title}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {link.desc}
            </p>
            {link.stat !== undefined && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '20px' }}>
                <span
                  className="text-display-sm"
                  style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
                >
                  <AnimatedCounter value={link.stat} />
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {link.statLabel}
                </span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
