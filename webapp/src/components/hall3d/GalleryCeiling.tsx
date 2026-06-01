interface GalleryCeilingProps {
  width: number
  depth: number
  wallHeight: number
}

/** Clean ceiling — extends deep to cover the full visible range. */
export function GalleryCeiling({ width, depth, wallHeight }: GalleryCeilingProps) {
  return (
    <group position={[0, wallHeight + 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial color="#f5f3ee" roughness={0.88} metalness={0} />
      </mesh>
    </group>
  )
}
