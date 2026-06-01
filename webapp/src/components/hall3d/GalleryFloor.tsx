import { MeshReflectorMaterial } from '@react-three/drei'

interface GalleryFloorProps {
  width: number
  depth: number
}

/** Dark reflective floor — subtle mirror for the gallery wall. */
export function GalleryFloor({ width, depth }: GalleryFloorProps) {
  return (
    <mesh
      position={[0, -0.01, depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={512}
        mixBlur={0.8}
        mixStrength={0.3}
        roughness={0.8}
        depthScale={0.5}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.2}
        color="#d8d8d2"
        metalness={0.2}
      />
    </mesh>
  )
}
