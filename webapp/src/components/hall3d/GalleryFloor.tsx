import { useRef } from 'react'
import * as THREE from 'three'
import { FLOOR_PRESETS } from './customization'

interface GalleryFloorProps {
  width: number
  depth: number
  floorType?: string
}

const FLOOR_PLANKS = 24

/** Floor with material variants — wood, marble, concrete, darkWood, parquet. */
export function GalleryFloor({ width, depth, floorType = 'wood' }: GalleryFloorProps) {
  const preset = FLOOR_PRESETS[floorType] ?? FLOOR_PRESETS.wood
  const meshRef = useRef<THREE.Mesh>(null!)

  return (
    <group>
      {/* Main floor plane */}
      <mesh
        ref={meshRef}
        position={[0, -0.005, depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial
          color={preset.color}
          roughness={preset.roughness}
          metalness={preset.metalness}
        />
      </mesh>

      {/* Wood/parquet plank lines — thin dark grooves */}
      {(floorType === 'wood' || floorType === 'parquet' || floorType === 'darkWood') && (
        <group position={[0, 0.001, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          {Array.from({ length: FLOOR_PLANKS - 1 }, (_, i) => {
            const x = -width / 2 + (width / FLOOR_PLANKS) * (i + 1)
            return (
              <mesh key={i} position={[x, 0, 0]}>
                <planeGeometry args={[0.008, depth + 2]} />
                <meshBasicMaterial color="#000000" opacity={0.06} transparent />
              </mesh>
            )
          })}
        </group>
      )}

      {/* Marble vein lines */}
      {floorType === 'marble' && (
        <group position={[0, 0.001, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          {Array.from({ length: 5 }, (_, i) => {
            const x = (i - 2) * 1.8 + (Math.sin(i * 2.1) * 0.5)
            return (
              <mesh key={i} position={[x, 0, 0]}>
                <planeGeometry args={[0.015, depth + 2]} />
                <meshBasicMaterial color="#d0c8bf" opacity={0.15} transparent />
              </mesh>
            )
          })}
        </group>
      )}
    </group>
  )
}
