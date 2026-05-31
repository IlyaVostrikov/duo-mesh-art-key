import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'
import { layoutTemplates, type ArtworkSlot } from '@/components/hall3d/layoutTemplates'
import { HallSlotCell } from '@/components/hall3d/HallSlotCell'
import { HallArtworkChip } from '@/components/hall3d/HallArtworkChip'
import type { HallArtwork } from '@/components/hall3d/types'
import { apiBaseUrl } from '@/lib/api'

interface HallMeta {
  slug: string
  title: string
  layoutConfig: LayoutConfig | null
}

interface LayoutConfig {
  template: string
  slots: Array<ArtworkSlot & { artworkId?: string | null }>
}

export function DashboardHallLayout() {
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [hall, setHall] = useState<HallMeta | null>(null)
  const [artworks, setArtworks] = useState<HallArtwork[]>([])
  const [layout, setLayout] = useState<LayoutConfig>({ template: 'singleRow', slots: [] })

  // Fetch hall + artworks
  useEffect(() => {
    if (!auth.accessToken || auth.user?.role !== 'ARTIST') return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // Get artist profile to find hall slug
        const artistRes = await fetch(`${apiBaseUrl}/api/artists/me`, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        })
        if (!artistRes.ok) throw new Error('Failed to load artist profile')
        const artist = await artistRes.json()

        if (!artist.hall?.slug) {
          setError('Сначала создайте зал / Create a hall first')
          setLoading(false)
          return
        }

        // Get hall detail
        const hallRes = await fetch(`${apiBaseUrl}/api/halls/${artist.hall.slug}`)
        if (!hallRes.ok) throw new Error('Failed to load hall')
        const hallData = await hallRes.json()

        if (cancelled) return
        setHall({ slug: hallData.slug, title: hallData.title, layoutConfig: hallData.layoutConfig as LayoutConfig | null })
        setArtworks(hallData.artworks ?? [])

        // Initialize layout from saved config or pick template
        if (hallData.layoutConfig?.slots?.length) {
          setLayout(hallData.layoutConfig as LayoutConfig)
        } else {
          const tpl = hallData.artworks.length <= 4 ? 'singleRow' : 'salonHang'
          const template = layoutTemplates.find((t) => t.name === tpl) ?? layoutTemplates[0]
          setLayout({
            template: template.name,
            slots: template.slots.map((s) => ({ ...s, artworkId: null })),
          })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [auth.accessToken, auth.user?.role])

  // Change template
  const handleTemplateChange = useCallback((templateName: string) => {
    const tpl = layoutTemplates.find((t) => t.name === templateName)
    if (!tpl) return
    // Preserve existing artwork assignments where slot indices match
    const prevSlots = layout.slots
    setLayout({
      template: templateName,
      slots: tpl.slots.map((s, i) => ({
        ...s,
        artworkId: prevSlots[i]?.artworkId ?? null,
      })),
    })
  }, [layout.slots])

  // Drop artwork onto a slot
  const handleDrop = useCallback((slotIndex: number, artworkId: string) => {
    setLayout((prev) => {
      const next = { ...prev, slots: [...prev.slots] }
      // Remove artwork from any slot it was already in
      for (let i = 0; i < next.slots.length; i++) {
        if (next.slots[i].artworkId === artworkId) {
          next.slots[i] = { ...next.slots[i], artworkId: null }
        }
      }
      // Assign to this slot (replace what was there)
      next.slots[slotIndex] = { ...next.slots[slotIndex], artworkId }
      return next
    })
    setSaved(false)
  }, [])

  // Remove artwork from a slot
  const handleRemove = useCallback((slotIndex: number) => {
    setLayout((prev) => {
      const next = { ...prev, slots: [...prev.slots] }
      next.slots[slotIndex] = { ...next.slots[slotIndex], artworkId: null }
      return next
    })
    setSaved(false)
  }, [])

  // Save
  const handleSave = useCallback(async () => {
    if (!auth.accessToken || !hall) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/halls/${hall.slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ layoutConfig: layout }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [auth.accessToken, hall, layout])

  // Which artworks are assigned to slots
  const assignedIds = new Set(layout.slots.map((s) => s.artworkId).filter(Boolean) as string[])
  const unassignedArtworks = artworks.filter((aw) => !assignedIds.has(aw.id))

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
          ))}
        </div>
      </DashboardLayout>
    )
  }

  if (error && !hall) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <h2 className="text-display-sm mb-2">Ошибка / Error</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 className="text-display-sm">
            Раскладка зала / Hall Layout
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Расставьте работы в 3D-зале / Arrange artworks in your 3D gallery
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {saved && (
            <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>Сохранено / Saved</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 24px',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить / Save'}
          </button>
          {hall && (
            <Link
              to="/hall/$hallSlug"
              params={{ hallSlug: hall.slug }}
              style={{
                padding: '8px 16px',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
              }}
            >
              Просмотр / Preview
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)',
          border: '1px solid var(--destructive)', color: 'var(--destructive)',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Template selector */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Шаблон раскладки / Layout Template
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {layoutTemplates.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleTemplateChange(tpl.name)}
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 500,
                backgroundColor: layout.template === tpl.name ? 'var(--accent)' : 'var(--surface)',
                color: layout.template === tpl.name ? '#000' : 'var(--text-secondary)',
                border: layout.template === tpl.name ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tpl.name} ({tpl.capacity})
            </button>
          ))}
        </div>
      </div>

      {/* Slot grid — visual wall */}
      <div style={{ marginBottom: '32px' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Слоты на стене / Wall Slots
        </h3>
        <div
          style={{
            backgroundColor: '#0a0a0f',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            padding: '24px',
            position: 'relative',
            minHeight: '300px',
          }}
        >
          {/* Wall outline */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%', height: '70%',
            border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '4px',
            pointerEvents: 'none',
          }} />

          {/* Slot cells */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(layout.slots.length, 4)}, 1fr)`,
            gap: '16px',
            position: 'relative',
            zIndex: 1,
          }}>
            {layout.slots.map((slot, i) => {
              const assigned = artworks.find((aw) => aw.id === slot.artworkId)
              return (
                <HallSlotCell
                  key={i}
                  index={i}
                  assigned={assigned ?? null}
                  onDrop={(artworkId) => handleDrop(i, artworkId)}
                  onRemove={() => handleRemove(i)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Artwork bank — unassigned artworks */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Доступные работы / Available Artworks ({unassignedArtworks.length})
        </h3>
        {unassignedArtworks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Все работы распределены / All artworks placed.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
          }}>
            {unassignedArtworks.map((aw) => (
              <HallArtworkChip key={aw.id} artwork={aw} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
