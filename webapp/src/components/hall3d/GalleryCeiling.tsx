interface GalleryCeilingProps {
  width: number
  depth: number
  wallHeight: number
  ceilingStyle?: string
}

const BEAM_H = 0.08
const BEAM_W = 0.06
const COFFER_COLS = 5
const COFFER_ROWS = 4

/** Ceiling with style variants — flat, coffered (grid beams), vaulted (arched). */
export function GalleryCeiling({ width, depth, wallHeight, ceilingStyle = 'flat' }: GalleryCeilingProps) {
  const y = wallHeight + 0.02

  return (
    <group position={[0, y, 0]}>
      {/* Base ceiling plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial color="#f5f3ee" roughness={0.88} metalness={0} />
      </mesh>

      {ceilingStyle === 'coffered' && <CofferedBeams width={width} depth={depth} />}
      {ceilingStyle === 'vaulted' && <VaultedArch width={width} depth={depth} />}
    </group>
  )
}

/** Grid of intersecting beams forming recessed coffered panels. */
function CofferedBeams({ width, depth }: { width: number; depth: number }) {
  const cols = Array.from({ length: COFFER_COLS - 1 }, (_, i) => {
    const x = -width / 2 + (width / COFFER_COLS) * (i + 1)
    return <mesh key={`col-${i}`} position={[x, -BEAM_H / 2, depth / 2]} castShadow>
      <boxGeometry args={[BEAM_W, BEAM_H, depth]} />
      <meshStandardMaterial color="#e8e4dc" roughness={0.7} metalness={0} />
    </mesh>
  })

  const rows = Array.from({ length: COFFER_ROWS - 1 }, (_, i) => {
    const z = (depth / COFFER_ROWS) * (i + 1)
    return <mesh key={`row-${i}`} position={[0, -BEAM_H / 2, z]} castShadow>
      <boxGeometry args={[width, BEAM_H, BEAM_W]} />
      <meshStandardMaterial color="#e8e4dc" roughness={0.7} metalness={0} />
    </mesh>
  })

  return <group>{cols}{rows}</group>
}

/** Three arched beams spanning the depth, rising ~0.3m above the ceiling plane. */
function VaultedArch({ width, depth }: { width: number; depth: number }) {
  const archH = 0.35
  const archR = width / 2
  const archY = archR - archH

  return (
    <group>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <mesh key={i} position={[0, archY, depth * t]} castShadow>
          <torusGeometry args={[archR, 0.04, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#e8e0d8" roughness={0.7} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}
