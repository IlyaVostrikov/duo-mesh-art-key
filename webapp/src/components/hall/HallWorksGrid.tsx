import { useNavigate } from '@tanstack/react-router'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { Hall3DCanvas } from '@/components/hall3d/Hall3DCanvas'
import { singleRow, salonHang } from '@/components/hall3d/layoutTemplates'
import type { Hall3DArtwork } from '@/components/hall3d/Hall3DScene'
import { parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface HallArtwork {
  id: string
  title: string
  posterUrl: string | null
  modelUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  category: string | null
  price: string | null
  currency: string
  status: string
}

interface HallLayoutConfig {
  template: string
  slots: Array<{
    x: number; y: number; z: number
    width?: number; height?: number
    artworkId?: string | null
  }>
}

interface HallWorksGridProps {
  artworks: HallArtwork[]
  artistName: string
  layoutConfig: HallLayoutConfig | null
  isMobile: boolean
  theme?: string | null
}

export function HallWorksGrid({ artworks, artistName, layoutConfig, isMobile, theme }: HallWorksGridProps) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const show3D = !reduced && !isMobile

  const hall3dArtworks: Hall3DArtwork[] = artworks.map((aw) => ({
    id: aw.id,
    title: aw.title,
    posterUrl: aw.posterUrl ? assetUrl(aw.posterUrl) : null,
    modelUrl: aw.modelUrl ?? null,
    mediaType: aw.mediaType,
    displayTitle: parseBilingualTitle(aw.title)[0],
  }))

  const layout3d = layoutConfig?.slots?.length
    ? {
        name: layoutConfig.template,
        capacity: layoutConfig.slots.length,
        slots: layoutConfig.slots.map((s) => ({ x: s.x, y: s.y, z: s.z, width: s.width, height: s.height })),
      }
    : (artworks.length <= 4 ? singleRow : salonHang)

  // Sort artworks by layout slot order, then append unmatched
  const sorted3dArtworks = layoutConfig?.slots
    ? (() => {
        const map = new Map(hall3dArtworks.map((a) => [a.id, a]))
        const result: Hall3DArtwork[] = []
        const used = new Set<string>()
        for (const slot of layoutConfig.slots) {
          if (slot.artworkId && map.has(slot.artworkId)) {
            result.push(map.get(slot.artworkId)!)
            used.add(slot.artworkId)
          }
        }
        for (const a of hall3dArtworks) if (!used.has(a.id)) result.push(a)
        return result
      })()
    : hall3dArtworks

  const handleArtworkClick = (id: string) => {
    navigate({ to: '/artwork/$artworkId', params: { artworkId: id } })
  }

  // 3D Gallery (desktop + no reduced motion)
  if (show3D && artworks.length > 0) {
    return (
      <section className="pb-0">
        <Hall3DCanvas
          artworks={sorted3dArtworks}
          layout={layout3d}
          onArtworkClick={handleArtworkClick}
          theme={theme}
        />
      </section>
    )
  }

  // 2D Grid fallback
  return (
    <section className="pb-24 max-w-7xl mx-auto px-5">
      <h2 className="text-display-sm mb-12">Работы / Works</h2>

      {artworks.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Пока нет работ / No artworks yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artworks.map((work, i) => (
            <RevealOnScroll key={work.id} direction="up" delay={i * 60}>
              <ArtworkCard
                id={work.id}
                title={parseBilingualTitle(work.title)[0]}
                artistName={artistName}
                posterUrl={assetUrl(work.posterUrl ?? '')}
                mediaType={work.mediaType}
                price={work.price}
                currency={work.currency}
                status={work.status}
              />
            </RevealOnScroll>
          ))}
        </div>
      )}
    </section>
  )
}
