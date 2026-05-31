import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { AdminLayout } from './AdminLayout'
import { apiBaseUrl } from '@/lib/api'

const ROLES = ['GUEST', 'ARTIST', 'COLLECTOR', 'ADMIN'] as const

interface UserRow {
  id: string
  email: string
  displayName: string | null
  role: string
  avatarUrl: string | null
  createdAt: string
  artist: { id: string; verified: boolean; tier: string } | null
  collector: { id: string } | null
  _count: { sessions: number }
}

export function AdminUsers() {
  const auth = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const fetchUsers = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await fetch(`${apiBaseUrl}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const changeRole = async (userId: string, role: string) => {
    if (!auth.accessToken) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message ?? `HTTP ${res.status}`)
        fetchUsers()
        return
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    } catch {
      fetchUsers()
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-display-sm mb-2">
        Пользователи / Users
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        {total} пользователей / total users
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по email/имени..."
          style={{
            flex: 1, maxWidth: '320px', padding: '6px 12px', fontSize: '0.875rem',
            backgroundColor: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none',
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '6px 12px', fontSize: '0.875rem',
            backgroundColor: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
          }}
        >
          <option value="">Все роли / All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', border: '1px solid var(--destructive)', color: 'var(--destructive)', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
          <button onClick={fetchUsers} style={{ marginLeft: '12px', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '48px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Имя / Name</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Роль / Role</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Artist</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Сессии / Sessions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {u.displayName ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--surface)',
                        color: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--text)',
                        border: `1px solid ${u.role === 'ADMIN' ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {u.artist ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: u.artist.verified ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {u.artist.verified ? '✓' : '○'} {u.artist.tier}
                        </span>
                      </span>
                    ) : u.collector ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Collector</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {u._count.sessions}
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
