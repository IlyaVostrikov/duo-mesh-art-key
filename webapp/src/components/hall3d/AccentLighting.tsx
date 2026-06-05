import { ACCENT_PRESETS } from './customization'

interface AccentLightingProps {
  width: number
  depth: number
  wallHeight: number
  accentLight?: string
}

/** Soft, diffuse color wash along walls — wide point lights with slow decay for atmospheric glow. */
export function AccentLighting({ width, depth, wallHeight, accentLight = 'none' }: AccentLightingProps) {
  const preset = ACCENT_PRESETS[accentLight] ?? ACCENT_PRESETS.none
  if (preset.intensity === 0) return null

  const halfW = width / 2
  const halfD = depth / 2

  // 4 soft floor washes — one per wall midpoint, placed ~1m from wall
  // Wide distance + low intensity + high decay = diffuse wash, not a visible dot
  const washes = [
    { pos: [0, wallHeight * 0.18, 1.2] as [number, number, number] },             // front wall
    { pos: [0, wallHeight * 0.18, depth - 1.2] as [number, number, number] },      // back wall
    { pos: [-halfW + 1.2, wallHeight * 0.18, halfD] as [number, number, number] }, // left wall
    { pos: [halfW - 1.2, wallHeight * 0.18, halfD] as [number, number, number] },  // right wall
  ]

  return (
    <group>
      {washes.map((w, i) => (
        <pointLight
          key={i}
          position={w.pos}
          intensity={preset.intensity * 0.6}
          distance={wallHeight * 2.5}
          color={preset.color}
          decay={2.8}
        />
      ))}
      {/* Ceiling washes — soft overhead color */}
      <pointLight
        position={[0, wallHeight - 0.3, halfD]}
        intensity={preset.intensity * 0.3}
        distance={wallHeight * 2}
        color={preset.color}
        decay={3}
      />
      <pointLight
        position={[-halfW * 0.5, wallHeight - 0.3, halfD * 0.6]}
        intensity={preset.intensity * 0.2}
        distance={wallHeight * 1.8}
        color={preset.color}
        decay={3}
      />
      <pointLight
        position={[halfW * 0.5, wallHeight - 0.3, halfD * 0.6]}
        intensity={preset.intensity * 0.2}
        distance={wallHeight * 1.8}
        color={preset.color}
        decay={3}
      />
    </group>
  )
}
