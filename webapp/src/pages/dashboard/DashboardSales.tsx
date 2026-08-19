import { useState, useEffect } from 'react'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'

interface SaleRecord {
  id: string
  artworkTitle: string
  price: string
  currency: string
  buyerName: string
  status: string
  createdAt: string
}

export function DashboardSales() {
  const { accessToken, api } = useAuth()
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    api.requestJson<{ sales?: SaleRecord[] }>('/api/sales/artist')
      .then((data) => setSales(data.sales ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [accessToken, api])

  const totalRevenue = sales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + Number(s.price), 0)

  return (
    <DashboardLayout>
      <RevealOnScroll direction="up">
        <h1 className="text-display-sm mb-4">Продажи / Sales</h1>
      </RevealOnScroll>

      {loading && (
        <RevealOnScroll direction="up" delay={80}>
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Загрузка... / Loading...</p>
          </div>
        </RevealOnScroll>
      )}

      {error && (
        <RevealOnScroll direction="up" delay={80}>
          <div
            style={{
              maxWidth: '500px', padding: '32px', borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--accent)' }}>{error}</p>
          </div>
        </RevealOnScroll>
      )}

      {!loading && !error && sales.length === 0 && (
        <RevealOnScroll direction="up" delay={80}>
          <div
            style={{
              maxWidth: '500px', padding: '32px', borderRadius: 'var(--radius)',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
              У вас пока нет продаж. Выставите работу в зал и дождитесь покупателя.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              No sales yet. List an artwork in your hall and wait for a buyer.
            </p>
          </div>
        </RevealOnScroll>
      )}

      {!loading && !error && sales.length > 0 && (
        <RevealOnScroll direction="up" delay={80}>
          {/* Summary */}
          <div
            style={{
              display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                padding: '16px 24px', borderRadius: 'var(--radius)',
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                minWidth: '160px',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Всего продаж / Total Sales
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {sales.length}
              </p>
            </div>
            <div
              style={{
                padding: '16px 24px', borderRadius: 'var(--radius)',
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                minWidth: '160px',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Выручка / Revenue
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {totalRevenue.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>

          {/* Sales table */}
          <div
            style={{
              borderRadius: 'var(--radius)', overflow: 'hidden',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Работа / Artwork</th>
                  <th style={thStyle}>Покупатель / Buyer</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Цена / Price</th>
                  <th style={thStyle}>Дата / Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>{s.artworkTitle}</td>
                    <td style={tdStyle}>{s.buyerName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {Number(s.price).toLocaleString('ru-RU')} {s.currency === 'RUB' ? '₽' : '$'}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RevealOnScroll>
      )}
    </DashboardLayout>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '0.75rem',
  fontWeight: 600,
  textAlign: 'left',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '0.875rem',
}
