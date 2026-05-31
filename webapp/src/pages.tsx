import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'

import { AccountMenu } from '@/components/AccountMenu'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { PageTransition } from '@/components/motion/PageTransition'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { apiBaseUrl } from '@/lib/api'

const navLinkClass = cn(
  buttonVariants({ variant: 'ghost', size: 'sm' }),
  'text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground data-[status=active]:hover:bg-secondary/80 data-[status=active]:hover:text-secondary-foreground',
)

export function RootLayout() {
  const auth = useAuth()
  const scrolled = useScrollPosition()

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-all duration-500',
          scrolled
            ? 'bg-background/98 backdrop-blur-xl border-border/80 shadow-[0_1px_0_rgba(198,255,58,0.04)]'
            : 'bg-background/80 backdrop-blur border-transparent',
        )}
      >
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <Typography asChild variant="h6">
            <Link to="/">DUO MESH</Link>
          </Typography>
          <nav className="ml-auto flex items-center gap-2" aria-label="Primary">
            <Typography asChild variant="control" tone="muted">
              <Link to="/gallery" className={navLinkClass}>
                Галерея / Gallery
              </Link>
            </Typography>
            <Typography asChild variant="control" tone="muted">
              <Link to="/verify" className={navLinkClass}>
                ArtKey
              </Link>
            </Typography>
            {auth.isAuthenticated ? (
              <AccountMenu />
            ) : (
              <Typography asChild variant="control" tone="muted">
                <Link to="/login" className={navLinkClass}>
                  Войти / Sign In
                </Link>
              </Typography>
            )}
          </nav>
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
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <Card className="w-fit">
        <CardContent className="flex items-center gap-3">
          <Spinner />
          <Typography variant="bodySm" tone="muted">
            Checking session...
          </Typography>
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
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16">
        <Typography variant="h2">Login required</Typography>
        <Typography tone="muted">Please sign in to access this page.</Typography>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12">
      <RevealOnScroll direction="up">
        <Typography variant="h1" className="mb-1">
          {auth.user.displayName ?? auth.user.email}
        </Typography>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={60}>
        <Typography tone="muted" className="mb-8">
          {auth.user.email}
        </Typography>
      </RevealOnScroll>

      {auth.user.role === 'ARTIST' ? <ArtistHub accessToken={auth.accessToken} /> : <CollectorHub />}
    </section>
  )
}

function ArtistHub({ accessToken }: { accessToken: string | null }) {
  const [stats, setStats] = useState<{ artworks: number; halls: number; sales: number } | null>(null)

  const fetchStats = useCallback(async () => {
    if (!accessToken) return
    try {
      const [artistRes, salesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/artists/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${apiBaseUrl}/api/sales/artist`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const artist = artistRes.ok ? await artistRes.json() : null
      const sales = salesRes.ok ? await salesRes.json() : null
      setStats({
        artworks: artist?.totalSalesCount ?? 0,
        halls: artist?.hall ? 1 : 0,
        sales: sales?.total ?? 0,
      })
    } catch {
      // Stats are non-critical
    }
  }, [accessToken])

  useEffect(() => { fetchStats() }, [fetchStats])

  const links = [
    { to: '/dashboard/artworks', title: 'Мои работы / My Works', desc: 'Управление произведениями / Manage artworks', stat: stats?.artworks, statLabel: 'работ / works' },
    { to: '/dashboard/hall', title: 'Выставочный зал / Exhibition Hall', desc: 'Настройка виртуальной галереи / Virtual gallery settings' },
    { to: '/dashboard/sales', title: 'Продажи / Sales', desc: 'История и статистика / History and stats', stat: stats?.sales, statLabel: 'продаж / sales' },
    { to: '/dashboard/settings', title: 'Профиль / Profile', desc: 'Statement, контакты, ссылки / Statement, contacts, links' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((link, i) => (
        <RevealOnScroll key={link.to} direction="up" delay={i * 80}>
          <Link to={link.to} style={{ textDecoration: 'none' }}>
            <Card className="group transition-all duration-300 hover:border-accent hover:shadow-[0_0_24px_rgba(198,255,58,0.04)] cursor-pointer">
              <CardContent className="flex flex-col gap-2 p-6">
                <Typography variant="h6" className="group-hover:text-accent transition-colors">
                  {link.title}
                </Typography>
                <Typography variant="bodySm" tone="muted">
                  {link.desc}
                </Typography>
                {link.stat !== undefined && (
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedCounter value={link.stat} />
                    </span>
                    <Typography variant="bodySm" tone="muted">
                      {link.statLabel}
                    </Typography>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </RevealOnScroll>
      ))}
    </div>
  )
}

function CollectorHub() {
  const links = [
    { to: '/collection', title: 'Моя коллекция / My Collection', desc: 'Приобретённые работы и сертификаты ArtKey / Acquired artworks and ArtKey certificates' },
    { to: '/collection/saved', title: 'Сохранённое / Saved', desc: 'Избранные работы для просмотра / Favorite artworks for later' },
    { to: '/following', title: 'Подписки / Following', desc: 'Отслеживаемые художники / Followed artists' },
    { to: '/dashboard/settings', title: 'Профиль / Settings', desc: 'Персональные настройки / Personal settings' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((link, i) => (
        <RevealOnScroll key={link.to} direction="up" delay={i * 80}>
          <Link to={link.to} style={{ textDecoration: 'none' }}>
            <Card className="group transition-all duration-300 hover:border-accent hover:shadow-[0_0_24px_rgba(198,255,58,0.04)] cursor-pointer">
              <CardContent className="flex flex-col gap-2 p-6">
                <Typography variant="h6" className="group-hover:text-accent transition-colors">
                  {link.title}
                </Typography>
                <Typography variant="bodySm" tone="muted">
                  {link.desc}
                </Typography>
              </CardContent>
            </Card>
          </Link>
        </RevealOnScroll>
      ))}
    </div>
  )
}
