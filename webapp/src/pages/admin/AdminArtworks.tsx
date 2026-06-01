import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { assetUrl } from '@/lib/asset-url'
import { AdminLayout } from './AdminLayout'
import { apiBaseUrl } from '@/lib/api'

// Admin-modifiable statuses. SOLD is excluded — only the sales flow may set it.
const STATUSES = ['DRAFT', 'LISTED', 'IN_EXHIBITION', 'RESERVED', 'ARCHIVED'] as const

interface ArtworkRow {
  id: string
  title: string
  status: string
  category: string
  mediaType: string
  posterUrl: string
  price: string | null
  currency: string
  createdAt: string
  artist: { id: string; user: { displayName: string | null } }
}

export function AdminArtworks() {
  const auth = useAuth()
  const [artworks, setArtworks] = useState<ArtworkRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchArtworks = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`${apiBaseUrl}/api/admin/artworks?${params}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken, statusFilter])

  useEffect(() => { fetchArtworks() }, [fetchArtworks])

  const changeStatus = async (artworkId: string, status: string) => {
    if (!auth.accessToken) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/artworks/${artworkId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? `HTTP ${res.status}`)
      }
      setArtworks((prev) => prev.map((a) => (a.id === artworkId ? { ...a, status } : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed')
      fetchArtworks()
    }
  }

  const deleteArtwork = async (artworkId: string, title: string, status: string) => {
    if (!auth.accessToken) return
    const shortTitle = title.split(' / ')[0]

    // Already archived — nothing to do
    if (status === 'ARCHIVED') {
      setError('Работа уже в архиве / Already archived')
      return
    }

    if (!confirm(`Архивировать «${shortTitle}»?\n\nРабота будет скрыта из галереи. Сертификаты (Art Keys), цепочка provenance и история продаж сохранятся. Это обратимо — статус можно вернуть на LISTED.`)) return

    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/artworks/${artworkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403) {
          // Has sales or art keys — offer force archive
          if (confirm(`${data.message}\n\nВсё равно архивировать с force=true? Связанные записи (продажи, ключи) останутся нетронутыми.`)) {
            const forceRes = await fetch(`${apiBaseUrl}/api/admin/artworks/${artworkId}?force=true`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${auth.accessToken}` },
            })
            if (!forceRes.ok) {
              const forceData = await forceRes.json().catch(() => ({}))
              throw new Error(forceData.message ?? `HTTP ${forceRes.status}`)
            }
            setArtworks((prev) => prev.map((a) => (a.id === artworkId ? { ...a, status: 'ARCHIVED' } : a)))
            return
          }
          return
        }
        throw new Error(data.message ?? `HTTP ${res.status}`)
      }
      setArtworks((prev) => prev.map((a) => (a.id === artworkId ? { ...a, status: 'ARCHIVED' } : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed')
      fetchArtworks()
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-display-sm mb-2">
        Работы / Artworks
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        {total} работ / total artworks — модерация и управление статусами
      </p>

      {/* Filter */}
      <div style={{ marginBottom: '24px' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 12px', fontSize: '0.875rem',
            backgroundColor: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
          }}
        >
          <option value="">Все статусы / All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', border: '1px solid var(--destructive)', color: 'var(--destructive)', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
          <button onClick={fetchArtworks} style={{ marginLeft: '12px', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '56px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, width: '60px' }} />
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Название / Title</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Художник / Artist</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Тип / Type</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Статус / Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Цена / Price</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }} />
              </tr>
            </thead>
            <tbody>
              {artworks.map((aw) => (
                <tr key={aw.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <img
                      src={assetUrl(aw.posterUrl)}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: '260px' }}>
                    <Link
                      to="/artwork/$artworkId"
                      params={{ artworkId: aw.id }}
                      style={{ color: 'var(--text)', textDecoration: 'none' }}
                      className="hover:text-accent"
                    >
                      {aw.title.split(' / ')[0]}
                    </Link>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {aw.category} · {aw.mediaType}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                    {aw.artist.user.displayName ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: aw.mediaType === 'MODEL_3D' ? 'rgba(var(--accent-rgb),0.1)' : 'rgba(96,165,250,0.1)',
                      color: aw.mediaType === 'MODEL_3D' ? 'var(--accent)' : '#60a5fa',
                    }}>
                      {aw.mediaType === 'MODEL_3D' ? '3D' : '2D'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select
                      value={aw.status}
                      onChange={(e) => changeStatus(aw.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        color: aw.status === 'LISTED' ? 'var(--accent)' : aw.status === 'SOLD' ? '#fbbf24' : 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {aw.price ? `${Number(aw.price).toLocaleString()} ${aw.currency}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => deleteArtwork(aw.id, aw.title, aw.status)}
                      title="Архивировать / Archive"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'transparent',
                        color: aw.status === 'ARCHIVED' ? 'var(--text-disabled)' : 'var(--text-muted)',
                        cursor: aw.status === 'ARCHIVED' ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: aw.status === 'ARCHIVED' ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (aw.status === 'ARCHIVED') return
                        e.currentTarget.style.borderColor = 'var(--destructive)'
                        e.currentTarget.style.color = 'var(--destructive)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      {aw.status === 'ARCHIVED' ? '—' : 'Арх'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
