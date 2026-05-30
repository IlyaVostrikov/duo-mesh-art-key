import { Link, Outlet } from '@tanstack/react-router'

import { AccountMenu } from '@/components/AccountMenu'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'

const navLinkClass = cn(
  buttonVariants({ variant: 'ghost', size: 'sm' }),
  'text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground data-[status=active]:hover:bg-secondary/80 data-[status=active]:hover:text-secondary-foreground',
)

export function RootLayout() {
  const auth = useAuth()

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur">
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
      <Outlet />
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
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-12">
      <Typography variant="h1">{auth.user.displayName ?? auth.user.email}</Typography>
      <Typography tone="muted">{auth.user.email}</Typography>
    </section>
  )
}
