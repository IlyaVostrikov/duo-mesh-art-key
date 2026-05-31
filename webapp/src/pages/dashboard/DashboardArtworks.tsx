import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { assetUrl } from '@/lib/asset-url'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from './DashboardLayout'
import { CreateArtworkForm } from '@/components/artwork/CreateArtworkForm'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { apiBaseUrl } from '@/lib/api'

interface ArtworkItem {
  id: string
  title: string
  posterUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  price: string | null
  currency: string
  status: string
  category: string
}

export function DashboardArtworks() {
  const auth = useAuth()
  const [artworks, setArtworks] = useState<ArtworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchMyWorks = useCallback(async () => {
    if (!auth.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/artworks?my=true&pageSize=50`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArtworks(data.artworks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [auth.accessToken])

  useEffect(() => { fetchMyWorks() }, [fetchMyWorks])

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить работу? / Delete artwork?')) return
    setDeleting(id)
    try {
      const res = await fetch(`${apiBaseUrl}/api/artworks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken!}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setArtworks((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-sm">
            Мои работы / My Artworks
          </h1>
        </RevealOnScroll>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? 'Отмена / Cancel' : '+ Новая работа / New Artwork'}
        </Button>
      </div>

      {showForm && (
        <CreateArtworkForm
          onCreated={() => { setShowForm(false); fetchMyWorks() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Works list */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ aspectRatio: '4/5', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Ошибка загрузки / Load error</p>
          <Button onClick={fetchMyWorks} size="sm">Повторить / Retry</Button>
        </div>
      )}

      {!loading && !error && artworks.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 py-16"
          style={{ color: 'var(--text-muted)' }}
        >
          <p>У вас пока нет работ / No artworks yet.</p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">+ Создать первую / Create First</Button>
          )}
        </div>
      )}

      {!loading && !error && artworks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artworks.map((aw, i) => (
            <RevealOnScroll key={aw.id} direction="up" delay={i * 50}>
            <div
              className="group relative"
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}
            >
              <Link to="/artwork/$artworkId" params={{ artworkId: aw.id }} style={{ textDecoration: 'none' }}>
                <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
                  <img
                    src={assetUrl(aw.posterUrl ?? '')}
                    alt={aw.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {aw.title.split(' / ')[0]}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {aw.category} · {aw.status === 'DRAFT' ? 'Черновик / Draft' : aw.status}
                    {aw.price && ` · ${aw.currency === 'RUB' ? `${Number(aw.price).toLocaleString('ru-RU')} ₽` : `$${Number(aw.price).toLocaleString('en-US')}`}`}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(aw.id)}
                disabled={deleting === aw.id}
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
                title="Удалить / Delete"
              >
                {deleting === aw.id ? '...' : '×'}
              </button>
            </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
