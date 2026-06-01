interface GalleryFloorProps {
  width: number
  depth: number
}

/** Matte floor — extends deep enough to sit under the camera at its farthest Z. */
export function GalleryFloor({ width, depth }: GalleryFloorProps) {
  return (
    <mesh
      position={[0, -0.005, depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width + 2, depth + 2]} />
      <meshStandardMaterial
        color="#f0ede6"
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  )
}
