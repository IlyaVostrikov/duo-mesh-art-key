import { useRef } from 'react'
import * as THREE from 'three'

interface GalleryWallProps {
  width: number
  height: number
}

/** Dark gallery wall — receives shadows from spotlights and framed artworks. */
export function GalleryWall({ width, height }: GalleryWallProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  return (
    <mesh
      ref={meshRef}
      position={[0, height / 2, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#e8e8e2"
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  )
}
