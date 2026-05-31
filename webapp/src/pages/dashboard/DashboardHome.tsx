import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { DashboardLayout } from './DashboardLayout'
import { apiBaseUrl } from '@/lib/api'

export function DashboardHome() {
  const auth = useAuth()
  const user = auth.user

  return (
    <DashboardLayout>
      <RevealOnScroll direction="up">
        <Badge variant="outline" style={{ marginBottom: '8px' }}>
          {user?.role === 'ARTIST' ? 'Художник / Artist' : user?.role === 'COLLECTOR' ? 'Коллекционер / Collector' : 'Гость / Guest'}
        </Badge>
      </RevealOnScroll>

      {user?.role === 'ARTIST' ? <ArtistDashboardCards accessToken={auth.accessToken} /> : <CollectorDashboardCards />}
    </DashboardLayout>
  )
}

function ArtistDashboardCards({ accessToken }: { accessToken: string | null }) {
  const [hallSlug, setHallSlug] = useState<string | null>(null)
  const [inquiries, setInquiries] = useState<any[]>([])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    fetch(`${apiBaseUrl}/api/artists/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const artist = await r.json()
        if (!cancelled && artist.hall?.slug) setHallSlug(artist.hall.slug)
      })
      .catch(() => {})
    // Fetch recent inquiries
    fetch(`${apiBaseUrl}/api/inquiries`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        if (!cancelled) setInquiries(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      <RevealOnScroll direction="up" delay={0}>
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
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={60}>
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
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={120}>
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
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={180}>
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
      </RevealOnScroll>
      {inquiries.length > 0 && (
        <RevealOnScroll direction="up" delay={240}>
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardHeader>
            <CardTitle>Запросы / Inquiries ({inquiries.length})</CardTitle>
            <CardDescription>Сообщения от посетителей галереи / Messages from gallery visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inquiries.slice(0, 10).map((inq: any) => (
                <div key={inq.id} style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>{inq.fromName}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(inq.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {inq.fromEmail}
                  </div>
                  {inq.message && (
                    <div style={{ marginTop: '4px', color: 'var(--text)' }}>{inq.message}</div>
                  )}
                  {inq.artwork && (
                    <div style={{ marginTop: '4px', color: 'var(--accent)', fontSize: '0.75rem' }}>
                      Re: {inq.artwork.title?.split(' / ')[0] || inq.artwork.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </RevealOnScroll>
      )}
    </div>
  )
}

function CollectorDashboardCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      <RevealOnScroll direction="up" delay={0}>
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
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={60}>
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
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={120}>
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
      </RevealOnScroll>
    </div>
  )
}
