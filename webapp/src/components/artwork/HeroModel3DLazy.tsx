import { lazy, Suspense } from 'react'
import type { HeroModel3DProps } from './HeroModel3D'

const HeroModel3DInner = lazy(() =>
  import('./HeroModel3D').then((m) => ({ default: m.HeroModel3D })),
)

/**
 * Lazy wrapper that code-splits Three.js + R3F + drei (~1 MB) from the main bundle.
 * Shows nothing until the chunk loads — the poster from HeroModel3D fills the space.
 */
export function HeroModel3DLazy(props: HeroModel3DProps) {
  return (
    <Suspense fallback={null}>
      <HeroModel3DInner {...props} />
    </Suspense>
  )
}
