import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from './DashboardLayout'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

export function DashboardHome() {
  const auth = useAuth()
  const user = auth.user

  return (
    <DashboardLayout>
      <Badge variant="outline" style={{ marginBottom: '8px' }}>
        {user?.role === 'ARTIST' ? 'Художник / Artist' : user?.role === 'COLLECTOR' ? 'Коллекционер / Collector' : 'Гость / Guest'}
      </Badge>

      {user?.role === 'ARTIST' ? <ArtistDashboardCards accessToken={auth.accessToken} /> : <CollectorDashboardCards />}
    </DashboardLayout>
  )
}

function ArtistDashboardCards({ accessToken }: { accessToken: string | null }) {
  const [hallSlug, setHallSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    fetch(`${API_BASE}/api/artists/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const artist = await r.json()
        if (!cancelled && artist.hall?.slug) setHallSlug(artist.hall.slug)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Мои работы / My Works</CardTitle>
          <CardDescription>Управление произведениями / Manage artworks</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link to="/dashboard/artworks">Открыть / Open</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Выставочный зал / Exhibition Hall</CardTitle>
          <CardDescription>Настройка виртуальной галереи / Virtual gallery settings</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/hall">Редактировать / Edit</Link>
          </Button>
          {hallSlug && (
            <Button asChild size="sm" variant="outline">
              <Link to="/hall/$hallSlug" params={{ hallSlug }}>Смотреть / View</Link>
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Продажи / Sales</CardTitle>
          <CardDescription>История и статистика / History and stats</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/sales">Смотреть / View</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Профиль / Profile</CardTitle>
          <CardDescription>Statement, контакты, ссылки / Statement, contacts, links</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/settings">Настроить / Configure</Link>
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
          <CardTitle>Моя коллекция / My Collection</CardTitle>
          <CardDescription>Приобретённые работы / Acquired artworks</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link to="/collection">Открыть / Open</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Сохранённое / Saved</CardTitle>
          <CardDescription>Избранные работы / Favorite artworks</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/collection/saved">Смотреть / View</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Подписки / Subscriptions</CardTitle>
          <CardDescription>Отслеживаемые художники / Followed artists</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/following">Открыть / Open</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
