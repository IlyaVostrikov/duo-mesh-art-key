/** Position for a single artwork slot on the gallery wall. */
export interface ArtworkSlot {
  /** X position relative to wall center (meters) */
  x: number
  /** Y position from floor (meters) */
  y: number
  /** Z position (offset from wall, for pedestals) */
  z: number
  /** Slot width for 2D artworks (meters) */
  width?: number
  /** Slot height for 2D artworks (meters) */
  height?: number
}

export interface SlotLayout {
  name: string
  /** Number of artworks this layout accommodates */
  capacity: number
  slots: ArtworkSlot[]
}

/** Single row — 4 evenly spaced artworks, eye-level. Classic gallery hang. */
export const singleRow: SlotLayout = {
  name: 'Один ряд / Single Row',
  capacity: 4,
  slots: [
    { x: -2.7, y: 1.8, z: 0, width: 0.65, height: 0.5 },
    { x: -0.9, y: 1.8, z: 0, width: 0.65, height: 0.5 },
    { x: 0.9, y: 1.8, z: 0, width: 0.65, height: 0.5 },
    { x: 2.7, y: 1.8, z: 0, width: 0.65, height: 0.5 },
  ],
}

/** Salon hang — mixed sizes, staggered, dense. Museum-style. */
export const salonHang: SlotLayout = {
  name: 'Салонная развеска / Salon Hang',
  capacity: 7,
  slots: [
    // Bottom row — larger pieces
    { x: -2.2, y: 1.1, z: 0, width: 0.7, height: 0.55 },
    { x: -0.7, y: 1.1, z: 0, width: 0.55, height: 0.7 },
    { x: 0.7, y: 1.1, z: 0, width: 0.7, height: 0.55 },
    { x: 2.2, y: 1.1, z: 0, width: 0.55, height: 0.7 },
    // Top row — smaller, offset
    { x: -1.4, y: 2.3, z: 0, width: 0.45, height: 0.35 },
    { x: 0.0, y: 2.4, z: 0, width: 0.5, height: 0.38 },
    { x: 1.4, y: 2.3, z: 0, width: 0.45, height: 0.35 },
  ],
}

/** Sculpture row — 3 pedestals in front of the wall for 3D works. */
export const sculptureRow: SlotLayout = {
  name: 'Скульптуры / Sculptures',
  capacity: 3,
  slots: [
    { x: -2.0, y: 0, z: 1.2 },
    { x: 0.0, y: 0, z: 1.5 },
    { x: 2.0, y: 0, z: 1.2 },
  ],
}

/** All available layout templates. */
export const layoutTemplates: SlotLayout[] = [
  singleRow,
  salonHang,
  sculptureRow,
]

export function getLayoutByName(name: string): SlotLayout | undefined {
  return layoutTemplates.find((l) => l.name === name)
}
