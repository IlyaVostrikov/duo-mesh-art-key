import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from './DashboardLayout'

export function DashboardHome() {
  const auth = useAuth()
  const user = auth.user

  return (
    <DashboardLayout>
      <Badge variant="outline" style={{ marginBottom: '8px' }}>
        {user?.role === 'ARTIST' ? 'Художник / Artist' : user?.role === 'COLLECTOR' ? 'Коллекционер / Collector' : 'Гость / Guest'}
      </Badge>

      {user?.role === 'ARTIST' ? <ArtistDashboardCards /> : <CollectorDashboardCards />}
    </DashboardLayout>
  )
}

function ArtistDashboardCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
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
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Statement, контакты, ссылки</CardDescription>
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
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
