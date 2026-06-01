/** Position for a single artwork slot on the gallery wall. */
export interface ArtworkSlot {
  x: number
  y: number
  z: number
  width?: number
  height?: number
}

export interface SlotLayout {
  name: string
  capacity: number
  slots: ArtworkSlot[]
}

const EYE = 1.55
const SPACING = 2.2 // center-to-center
const ART_W = 1.05
const ART_H = 1.25

/** Build a single-row gallery hang — uniform height, equal spacing. */
function buildRow(count: number): ArtworkSlot[] {
  const slots: ArtworkSlot[] = []
  const totalSpan = (count - 1) * SPACING
  const startX = -totalSpan / 2
  for (let i = 0; i < count; i++) {
    slots.push({ x: startX + i * SPACING, y: EYE, z: 0, width: ART_W, height: ART_H })
  }
  return slots
}

export const singleRow: SlotLayout = {
  name: 'Один ряд / Single Row',
  capacity: 6,
  slots: buildRow(6),
}

export const salonHang: SlotLayout = {
  name: 'Салонная развеска / Salon Hang',
  capacity: 5,
  slots: buildRow(5),
}

/** Sculpture row — pedestals on the floor, centered under the wall hang line. */
export const sculptureRow: SlotLayout = {
  name: 'Скульптуры / Sculptures',
  capacity: 5,
  slots: buildRow(5).map((s) => ({ ...s, y: 0, z: 1.5, width: undefined, height: undefined })),
}

export const layoutTemplates: SlotLayout[] = [singleRow, salonHang, sculptureRow]

export function getLayoutByName(name: string): SlotLayout | undefined {
  return layoutTemplates.find((l) => l.name === name)
}
