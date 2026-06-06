import { useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT, EYE } from './RoomGroup'

/**
 * Multi-source lighting for a single wall artwork.
 *
 * Ceiling lights stay tight to the wall (Z ≤ 0.3) for direct top-down illumination.
 * Floor lights sit behind the camera (Z ≈ 2.5m into the room) and are spread ±0.5m
 * in X so the light doesn't appear to come from a single point.
 *
 * Each spotLight target is explicitly added to the scene via <primitive>
 * so the light aims at the artwork, not the origin.
 */
export function ArtworkLighting({ slotX, slotZ, castShadow = true }: { slotX: number; slotZ: number; castShadow?: boolean }) {
  const target = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(slotX, EYE, slotZ)
    return t
  }, [slotX, slotZ])

  return (
    <>
      <primitive object={target} />

      {/* Ceiling track — directly above the artwork */}
      <spotLight
        position={[slotX, WALL_HEIGHT, slotZ + 0.15]}
        target={target}
        angle={0.55}
        penumbra={0.8}
        intensity={12}
        distance={5}
        color="#fffef8"
      />

      {/* Wall wash — from wall-top, tight to wall (only this one casts shadows) */}
      <spotLight
        position={[slotX, WALL_HEIGHT - 0.2, slotZ + 0.3]}
        target={target}
        angle={0.5}
        penumbra={0.7}
        intensity={16}
        distance={5}
        color="#fffaf0"
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 128 : undefined}
        shadow-mapSize-height={castShadow ? 128 : undefined}
        shadow-bias={-0.0005}
      />

      {/* Floor fill — single wide fill, no shadow */}
      <pointLight
        position={[slotX, 0.12, slotZ + 2.5]}
        intensity={5}
        distance={6}
        decay={2.5}
        color="#fef9f0"
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
      <primitive object={target} />

      {/* Ceiling track */}
      <spotLight
        position={[x, WALL_HEIGHT, z - 0.15]}
        target={target}
        angle={0.45}
        penumbra={0.7}
        intensity={10}
        distance={5}
        color="#fffef8"
      />

      {/* Main spot — from wall direction */}
      <spotLight
        position={[x, WALL_HEIGHT - 0.3, z - 0.15]}
        target={target}
        angle={0.4}
        penumbra={0.6}
        intensity={20}
        distance={5}
        color="#fffaf0"
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 128 : undefined}
        shadow-mapSize-height={castShadow ? 128 : undefined}
        shadow-bias={-0.0005}
      />

      {/* Floor fill */}
      <pointLight
        position={[x, 0.15, z + 0.2]}
        intensity={2}
        distance={3}
        decay={2.5}
        color="#fff5ee"
      />
    </>
  )
}
