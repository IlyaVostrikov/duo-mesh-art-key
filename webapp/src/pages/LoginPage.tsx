import { Link } from '@tanstack/react-router'
import { AuthForm } from '@/components/AuthForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { useAuth } from '@/lib/use-auth'

export function LoginPage() {
  const auth = useAuth()

  if (auth.isBootstrapping) {
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

  if (auth.user) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16">
        <RevealOnScroll direction="up">
          <Badge variant="outline" className="w-fit">
            Authenticated
          </Badge>
        </RevealOnScroll>
        <RevealOnScroll direction="up" delay={60}>
          <div className="grid max-w-3xl gap-4">
            <Typography variant="h1">Session is active</Typography>
            <Typography className="max-w-2xl" tone="muted">
              Logged in as{' '}
              <Typography as="strong" variant="emphasis" tone="default">
                {auth.user.email}
              </Typography>
              .
            </Typography>
          </div>
        </RevealOnScroll>
        <RevealOnScroll direction="up" delay={120}>
          <Button asChild size="lg" className="w-fit">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </RevealOnScroll>
      </section>
    )
  }

  return (
    <AuroraBackground>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="grid gap-5">
          <RevealOnScroll direction="up">
            <Badge variant="outline" className="w-fit">
              Цифровая галерея / Digital Gallery
            </Badge>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={80}>
            <Typography className="max-w-3xl" variant="h1">
              Виртуальные 3D-галереи, ArtKey-сертификаты и provenance-цепочки для цифрового искусства.
            </Typography>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={160}>
            <Typography className="max-w-2xl" tone="muted">
              DUO MESH — платформа для художников и коллекционеров. Выставляйте 3D-работы, создавайте
              цифровые сертификаты подлинности, собирайте коллекции.
            </Typography>
          </RevealOnScroll>
        </div>
        <RevealOnScroll direction="up" delay={200}>
          <AuthForm />
        </RevealOnScroll>
      </section>
    </AuroraBackground>
  )
}
