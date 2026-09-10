/** Position for a single artwork slot on the gallery wall. */
export interface ArtworkSlot {
  x: number
  y: number
  z: number
  artworkId?: string | null
  width?: number
  height?: number
}

export interface SlotLayout {
  name: string
  capacity: number
  slots: ArtworkSlot[]
}

const EYE = 1.55
const SPACING = 2.2
const ART_W = 1.05
const ART_H = 1.25

/** Compute centered slot positions for a given artwork count.
 *  1 artwork → center (x=0)
 *  2 artworks → -1.1, +1.1
 *  3 artworks → -2.2, 0, +2.2
 *  etc.
 */
export function computeSlots(count: number): ArtworkSlot[] {
  if (count <= 0) return []
  const totalSpan = (count - 1) * SPACING
  const startX = -totalSpan / 2
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * SPACING,
    y: EYE,
    z: 0,
    width: ART_W,
    height: ART_H,
  }))
}

/** Compute the wall width needed to contain the given slots. */
export function computeWallWidth(slots: ArtworkSlot[]): number {
  if (slots.length === 0) return 10
  const xs = slots.map((s) => s.x)
  const span = Math.max(...xs) - Math.min(...xs)
  return Math.max(14, Math.ceil(span + 1.3 + 4))
}

// ─── Pre-built template displays (used in layout editor UI only) ───

export const singleRow: SlotLayout = {
  name: 'Один ряд / Single Row',
  capacity: 6,
  slots: computeSlots(6),
}

export const salonHang: SlotLayout = {
  name: 'Салонная развеска / Salon Hang',
  capacity: 5,
  slots: computeSlots(5),
}

export const sculptureRow: SlotLayout = {
  name: 'Скульптуры / Sculptures',
  capacity: 5,
  slots: computeSlots(5).map((s) => ({ ...s, y: 0, z: 1.5, width: undefined, height: undefined })),
}

export const layoutTemplates: SlotLayout[] = [singleRow, salonHang, sculptureRow]

export function getLayoutByName(name: string): SlotLayout | undefined {
  return layoutTemplates.find((l) => l.name === name)
}

export interface SavedHallLayout { template: string; slots: ArtworkSlot[] }

export function resolveHallLayout(artworks: readonly { id: string }[], config?: SavedHallLayout | null): SlotLayout {
  if (config?.slots?.length) return { name: config.template, capacity: config.slots.length, slots: config.slots }
  return { name: 'auto', capacity: artworks.length, slots: computeSlots(artworks.length) }
}

/** Explicit assignments preserve empty/private slots; older layouts remain positional. */
export function resolveSlottedArtworks<T extends { id: string; mediaType: string }>(artworks: readonly T[], layout: SlotLayout) {
  const assigned = layout.slots.some(slot => Object.prototype.hasOwnProperty.call(slot, 'artworkId'))
  const byId = new Map(artworks.map(artwork => [artwork.id, artwork]))
  const used = new Set<string>()
  const result: Array<{ artwork: T; slot: ArtworkSlot }> = []
  layout.slots.forEach((raw, index) => {
    const artwork = assigned ? (raw.artworkId ? byId.get(raw.artworkId) : undefined) : artworks[index]
    if (!artwork || used.has(artwork.id)) return
    used.add(artwork.id)
    const slot = artwork.mediaType === 'MODEL_3D' ? { ...raw, y: 0, z: raw.z === 0 ? 1.5 : raw.z } : raw
    result.push({ artwork, slot })
  })
  return result
}
