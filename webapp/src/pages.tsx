import { Link, Outlet } from '@tanstack/react-router'

import { AccountMenu } from '@/components/AccountMenu'
import { AuthForm } from '@/components/AuthForm'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'

const navLinkClass = cn(
  buttonVariants({ variant: 'ghost', size: 'sm' }),
  'text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground data-[status=active]:hover:bg-secondary/80 data-[status=active]:hover:text-secondary-foreground'
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
              <Link to="/hall/$hallSlug" params={{ hallSlug: 'iron-forge' }} className={navLinkClass}>
                Зал / Hall
              </Link>
            </Typography>
            <Typography asChild variant="control" tone="muted">
              <Link to="/viewer/3d" className={navLinkClass}>
                3D
              </Link>
            </Typography>
          </nav>
          {auth.isAuthenticated && <AccountMenu />}
        </div>
      </header>
      <Outlet />
    </main>
  )
}

export function HomePage() {
  const auth = useAuth()

  if (auth.isBootstrapping) {
    return <LoadingState />
  }

  if (auth.user) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16">
        <Badge variant="outline" className="w-fit">
          Authenticated starter
        </Badge>
        <div className="grid max-w-3xl gap-4">
          <Typography variant="h1">Session is active</Typography>
          <Typography className="max-w-2xl" tone="muted">
            Logged in as{' '}
            <Typography as="strong" variant="emphasis" tone="default">
              {auth.user.email}
            </Typography>
            .
            This is the baseline auth pattern for future web features.
          </Typography>
        </div>
        <Button asChild size="lg" className="w-fit">
          <Link to="/app">Open app</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
      <div className="grid gap-5">
        <Badge variant="outline" className="w-fit">
          Цифровая галерея / Digital Gallery
        </Badge>
        <Typography className="max-w-3xl" variant="h1">
          Виртуальные 3D-галереи, ArtKey-сертификаты и provenance-цепочки для цифрового искусства.
        </Typography>
        <Typography className="max-w-2xl" tone="muted">
          DUO MESH — платформа для художников и коллекционеров. Выставляйте 3D-работы, создавайте
          цифровые сертификаты подлинности, собирайте коллекции.
        </Typography>
      </div>
      <AuthForm />
    </section>
  )
}

export function AppPage() {
  const auth = useAuth()

  if (auth.isBootstrapping) {
    return <LoadingState />
  }

  if (!auth.user) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16">
        <Badge variant="outline" className="w-fit">
          Protected example
        </Badge>
        <div className="grid max-w-3xl gap-4">
          <Typography variant="h1">Login required</Typography>
          <Typography className="max-w-2xl" tone="muted">
            This route intentionally stays small and shows where protected product UI begins.
          </Typography>
        </div>
        <Button asChild size="lg" className="w-fit">
          <Link to="/">Go to auth</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-12">
      <div className="grid gap-3">
        <Badge variant="outline" className="w-fit">
          Current user
        </Badge>
        <Typography variant="h1">
          {auth.user.displayName ?? auth.user.email}
        </Typography>
        <Typography tone="muted">{auth.user.email}</Typography>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>User ID</CardTitle>
            <CardDescription wrap="break">{auth.user.id}</CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Created</CardTitle>
            <CardDescription>{new Date(auth.user.createdAt).toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}

function LoadingState() {
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
