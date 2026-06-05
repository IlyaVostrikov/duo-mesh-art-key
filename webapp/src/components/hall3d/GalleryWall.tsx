interface GalleryWallProps {
  width: number
  height: number
  theme?: string | null
  customColor?: string | null
}

const THEME_COLORS: Record<string, { wall: string; roughness: number }> = {
  default: { wall: '#faf8f4', roughness: 0.95 },
  dark:    { wall: '#3a3a36', roughness: 0.95 },
  warm:    { wall: '#f5ede3', roughness: 0.95 },
  cool:    { wall: '#eaf0f5', roughness: 0.95 },
}

const SKIRTING_H = 0.08
const SKIRTING_D = 0.015

/** Gallery wall with theme presets and custom hex color support. */
export function GalleryWall({ width, height, theme, customColor }: GalleryWallProps) {
  const isCustom = theme === 'custom' && customColor
  const colors = isCustom
    ? { wall: customColor!, roughness: 0.9 }
    : (THEME_COLORS[theme ?? 'default'] ?? THEME_COLORS.default)

  return (
    <group position={[0, height / 2, 0]}>
      {/* Main wall */}
      <mesh receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={colors.wall} roughness={colors.roughness} metalness={0} />
      </mesh>

      {/* Skirting board */}
      <mesh position={[0, -height / 2 + SKIRTING_H / 2, SKIRTING_D]} receiveShadow castShadow>
        <boxGeometry args={[width, SKIRTING_H, SKIRTING_D * 2]} />
        <meshStandardMaterial color="#f0ede6" roughness={0.7} metalness={0} />
      </mesh>
    </group>
  )
}
