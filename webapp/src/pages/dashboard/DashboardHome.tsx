import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'

export function DashboardHome() {
  const auth = useAuth()
  const user = auth.user

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Typography variant="h2">Дашборд</Typography>
          <Typography tone="muted">
            {user?.displayName ?? user?.email}
          </Typography>
        </div>
        <Badge variant="outline">
          {user?.role === 'ARTIST' ? 'Художник' : user?.role === 'COLLECTOR' ? 'Коллекционер' : 'Гость'}
        </Badge>
      </div>

      {user?.role === 'ARTIST' ? <ArtistDashboardCards /> : <CollectorDashboardCards />}
    </section>
  )
}

function ArtistDashboardCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Мои работы</CardTitle>
          <CardDescription>Управление произведениями</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link to="/dashboard/artworks">Открыть</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Выставочный зал</CardTitle>
          <CardDescription>Настройка виртуальной галереи</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/hall">Редактировать</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Продажи</CardTitle>
          <CardDescription>История и статистика</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/sales">Смотреть</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Премьеры</CardTitle>
          <CardDescription>Управление событиями</CardDescription>
        </CardHeader>
        <CardContent>
          <Typography tone="muted" variant="bodySm">Скоро</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Аналитика</CardTitle>
          <CardDescription>Просмотры и статистика</CardDescription>
        </CardHeader>
        <CardContent>
          <Typography tone="muted" variant="bodySm">Скоро</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>Профиль и платёжные данные</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/settings">Настроить</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CollectorDashboardCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Моя коллекция</CardTitle>
          <CardDescription>Приобретённые работы</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link to="/collection">Открыть</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Сохранённое</CardTitle>
          <CardDescription>Избранные работы</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/collection/saved">Смотреть</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Подписки</CardTitle>
          <CardDescription>Отслеживаемые художники</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/following">Открыть</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
