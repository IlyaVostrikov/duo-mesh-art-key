import type { Hall3DArtwork } from './Hall3DScene'
import type { HallCustomization } from './customization'

export interface HallData {
  slug: string
  title: string
  theme: string | null
  coverImageUrl: string | null
  customization?: HallCustomization | null
  artworks: Hall3DArtwork[]
}

/** Sort halls alphabetically by slug for deterministic left-to-right ordering. */
export function orderHalls(halls: HallData[]): HallData[] {
  return [...halls].sort((a, b) => a.slug.localeCompare(b.slug))
}

export function roomCenterX(index: number, wallWidths: number[]): number {
  if (index === 0) return 0
  let x = 0
  for (let i = 0; i < index; i++) {
    x += wallWidths[i] / 2 + 0.02 + wallWidths[i + 1] / 2
  }
  return x
}
