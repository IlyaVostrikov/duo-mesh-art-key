import { Link, Outlet } from '@tanstack/react-router'
import { AccountMenu } from '@/components/AccountMenu'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { NavPill } from '@/components/ui/nav-pill'
import { HubCard } from '@/components/ui/hub-card'
import { HubGrid } from '@/components/layout/hub-grid'
import { PageTransition } from '@/components/motion/PageTransition'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { LogoLockup } from '@/components/ui/duo-mesh-logo'
import { useAuth } from '@/lib/use-auth'
import { useCallback, useEffect, useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

export function RootLayout() {
  const auth = useAuth()

  return (
    <main style={{ minHeight: '100svh', background: 'transparent', color: 'var(--text)' }}>
      <header
        className="sticky top-0 z-50 border-b border-border"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="flex items-center mx-auto h-14 gap-8"
          style={{ maxWidth: '1280px', padding: '0 20px' }}
        >
          <Link
            to="/"
            style={{ textDecoration: 'none', flexShrink: 0, color: 'var(--text)' }}
          >
            <LogoLockup size={16} />
          </Link>

          <div style={{ width: '1px', height: '14px', background: 'var(--border)' }} />

          <nav className="flex items-center gap-6">
            <NavPill to="/gallery" label="Галерея" />
            <NavPill to="/verify" label="ArtKey" />
          </nav>

          <div className="ml-auto flex items-center">
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
        <CardContent className="flex items-center gap-3">
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
      <RevealOnScroll direction="up">
        <div className="border-b border-border pb-6 mb-12">
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

  return (
    <HubGrid>
      <HubCard
        to="/dashboard/artworks"
        title="Мои работы"
        description="Управление произведениями"
        stat={stats?.artworks}
        statLabel="работ"
      />
      <HubCard
        to="/dashboard/hall"
        title="Выставочный зал"
        description="Настройка виртуальной галереи"
      />
      <HubCard
        to="/dashboard/sales"
        title="Продажи"
        description="История и статистика"
        stat={stats?.sales}
        statLabel="продаж"
      />
      <HubCard
        to="/dashboard/settings"
        title="Профиль"
        description="Statement, контакты, ссылки"
      />
    </HubGrid>
  )
}

function CollectorHub() {
  return (
    <HubGrid>
      <HubCard
        to="/collection"
        title="Моя коллекция"
        description="Приобретённые работы и сертификаты ArtKey"
      />
      <HubCard
        to="/collection/saved"
        title="Сохранённое"
        description="Избранные работы для просмотра"
      />
      <HubCard
        to="/following"
        title="Подписки"
        description="Отслеживаемые художники"
      />
      <HubCard
        to="/dashboard/settings"
        title="Профиль"
        description="Персональные настройки"
      />
    </HubGrid>
  )
}
