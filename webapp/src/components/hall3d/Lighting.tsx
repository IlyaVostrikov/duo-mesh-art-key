import { useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, EYE } from './RoomGroup'

/** Multi-source lighting for a single wall artwork:
 *  - Ceiling track light (top-front, wide beam aimed at artwork)
 *  - Top wall wash (wall-height, angled down)
 *  - Floor uplight (bottom-front, aimed up at artwork)
 */
export function ArtworkLighting({ slotX, slotZ, castShadow = true }: { slotX: number; slotZ: number; castShadow?: boolean }) {
  const target = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(slotX, EYE, slotZ)
    return t
  }, [slotX, slotZ])

  return (
    <>
      {/* Ceiling track light — wide, soft, from above and in front */}
      <spotLight
        position={[slotX, WALL_HEIGHT + 0.3, slotZ + 0.3]}
        target={target}
        angle={0.75}
        penumbra={1.0}
        intensity={8}
        distance={8}
        color="#fffef8"
      />

      {/* Top wall wash — from wall-top, medium spread */}
      <spotLight
        position={[slotX, WALL_HEIGHT - 0.15, slotZ + 1.5]}
        target={target}
        angle={0.6}
        penumbra={0.9}
        intensity={12}
        distance={10}
        color="#fffaf0"
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 256 : undefined}
        shadow-mapSize-height={castShadow ? 256 : undefined}
      />

      {/* Floor uplight — wide beam aimed up at artwork from below */}
      <spotLight
        position={[slotX, 0.1, slotZ + 1.0]}
        target={target}
        angle={0.7}
        penumbra={1.0}
        intensity={6}
        distance={7}
        color="#fef9f0"
      />

      {/* Floor fill point light — soft ambient wash from floor level */}
      <pointLight
        position={[slotX, 0.15, slotZ + 2.0]}
        intensity={2}
        distance={6}
        decay={2.5}
        color="#fff5ee"
      />
    </>
  )
}

/** Spotlight aimed at a pedestal position. */
export function PedestalSpot({ x, z, castShadow = true }: { x: number; z: number; castShadow?: boolean }) {
  const target = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(x, 0.55, z)
    return t
  }, [x, z])

  return (
    <>
      {/* Ceiling track for pedestal */}
      <spotLight
        position={[x, WALL_HEIGHT + 0.3, z - 0.3]}
        target={target}
        angle={0.6}
        penumbra={0.9}
        intensity={8}
        distance={7}
        color="#fffef8"
      />
      {/* Main pedestal spot */}
      <spotLight
        position={[x, WALL_HEIGHT - 0.3, z + 0.6]}
        target={target}
        angle={0.5}
        penumbra={0.85}
        intensity={16}
        distance={8}
        color="#fffaf0"
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 256 : undefined}
        shadow-mapSize-height={castShadow ? 256 : undefined}
      />
      {/* Floor fill */}
      <pointLight
        position={[x, 0.3, z + 1.0]}
        intensity={2}
        distance={5}
        decay={2.5}
        color="#fff5ee"
      />
    </>
  )
}
