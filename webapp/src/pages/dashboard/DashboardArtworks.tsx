import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { assetUrl } from '@/lib/asset-url'
import { parseBilingualTitle, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from './DashboardLayout'
import { CreateArtworkForm } from '@/components/artwork/CreateArtworkForm'
import { EditArtworkForm } from '@/components/artwork/EditArtworkForm'
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
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const handleDelete = async (id: string, aw: ArtworkItem) => {
    const consequences: string[] = []
    if (aw.status === 'SOLD') {
      consequences.push('Работа уже продана клиенту. Удаление нарушит цепочку провенанса и учёт продаж.')
    } else if (aw.status === 'RESERVED') {
      consequences.push('Работа зарезервирована. Бронь будет потеряна.')
    } else if (aw.status === 'IN_EXHIBITION') {
      consequences.push('Работа участвует в выставке.')
    } else if (aw.status === 'LISTED') {
      consequences.push('Работа опубликована в зале и доступна для покупки.')
    }
    if (aw.mediaType === 'MODEL_3D') {
      consequences.push('3D-модель и все связанные текстуры будут удалены без возможности восстановления.')
    }
    consequences.push('ArtKey и записи провенанса будут удалены навсегда.')
    consequences.push('Это действие нельзя отменить.')

    const displayTitle = parseBilingualTitle(aw.title)[0]
    const msg = `Удалить работу «${displayTitle}»?\n\n${consequences.map((c) => `• ${c}`).join('\n')}\n\nНапишите "удалить" для подтверждения:`
    const input = prompt(msg)
    if (input?.toLowerCase() !== 'удалить') return

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

  if (auth.user && auth.user.role !== 'ARTIST' && auth.user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
            Сначала создайте профиль художника, чтобы загружать работы / Create an artist profile to upload artworks.
          </p>
          <Button asChild size="sm"><Link to="/onboarding/artist">Создать профиль / Create profile</Link></Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <RevealOnScroll direction="up">
          <h1 className="text-display-sm">
            Мои работы / My Artworks
          </h1>
        </RevealOnScroll>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null) }} size="sm">
          {showForm ? 'Отмена / Cancel' : '+ Новая работа / New Artwork'}
        </Button>
      </div>

      {showForm && (
        <CreateArtworkForm
          onCreated={() => { setShowForm(false); fetchMyWorks() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingId && (
        <EditArtworkForm
          artworkId={editingId}
          onSaved={() => { setEditingId(null); fetchMyWorks() }}
          onCancel={() => setEditingId(null)}
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
                    {parseBilingualTitle(aw.title)[0]}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {aw.category} · {aw.status === 'DRAFT' ? 'Черновик / Draft' : aw.status}
                    {formatPrice(aw.price, aw.currency) && ` · ${formatPrice(aw.price, aw.currency)}`}
                  </p>
                </div>
              </Link>
              <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); setEditingId(aw.id); setShowForm(false) }}
                  className="w-8 h-8 flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                  title="Редактировать / Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(aw.id, aw)}
                  disabled={deleting === aw.id}
                  className="w-8 h-8 flex items-center justify-center text-xs"
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
            </div>
            </RevealOnScroll>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
