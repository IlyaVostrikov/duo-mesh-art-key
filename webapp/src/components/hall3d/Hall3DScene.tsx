/** Shared artwork type consumed by 3D hall components. */
export interface Hall3DArtwork {
  id: string
  title: string
  posterUrl: string | null
  modelUrl: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  /** Display title on hover label */
  displayTitle?: string
}
