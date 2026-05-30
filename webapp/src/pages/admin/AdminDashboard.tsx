import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AdminLayout } from './AdminLayout'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

interface AdminStats {
  users: number
  artists: number
  artworks: number
  halls: number
  sales: number
  artKeys: number
}

export function AdminDashboard() {
  const auth = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!auth.accessToken) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [auth.accessToken])

  useEffect(() => { fetchStats() }, [fetchStats])

  const cards = stats ? [
    { label: 'Пользователи / Users', value: stats.users, color: 'var(--text)' },
    { label: 'Художники / Artists', value: stats.artists, color: 'var(--accent)' },
    { label: 'Работы / Artworks', value: stats.artworks, color: '#60a5fa' },
    { label: 'Залы / Halls', value: stats.halls, color: '#c084fc' },
    { label: 'Продажи / Sales', value: stats.sales, color: '#fbbf24' },
    { label: 'ArtKeys', value: stats.artKeys, color: '#34d399' },
  ] : []

  return (
    <AdminLayout>
      <h1 className="text-display-sm mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Админ-панель / Admin
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        Обзор системы / System overview
      </p>

      {error && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', border: '1px solid var(--destructive)', color: 'var(--destructive)', marginBottom: '24px', fontSize: '0.875rem' }}>
          Ошибка загрузки: {error}
          <button onClick={fetchStats} style={{ marginLeft: '12px', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>
            Повторить
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        {cards.map((card, i) => (
          <RevealOnScroll key={card.label} direction="up" delay={i * 60}>
            <div style={{
              padding: '24px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                {stats ? <AnimatedCounter value={card.value} /> : '—'}
              </div>
            </div>
          </RevealOnScroll>
        ))}
        {!stats && !error && (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '100px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 100}ms` }} />
          ))
        )}
      </div>
    </AdminLayout>
  )
}
