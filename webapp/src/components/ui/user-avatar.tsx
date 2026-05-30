import { useMemo } from 'react'

interface UserAvatarProps {
  userId: string
  displayName?: string | null
  email?: string
  size?: number
}

function hashUserId(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) {
    h = (h * 33) ^ id.charCodeAt(i)
    h = h >>> 0
  }
  return h
}

const HUES = [210, 160, 280, 30, 340, 45, 190, 140, 320, 20]
const GRID = 5

function buildPattern(hash: number): boolean[][] {
  const cols = Math.ceil(GRID / 2)
  const pattern: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false))
  let bits = hash

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < cols; col++) {
      const fill = (bits & 1) === 1
      pattern[row][col] = fill
      pattern[row][GRID - 1 - col] = fill
      bits = bits >>> 1
    }
  }
  return pattern
}

function initials(name?: string | null, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.trim().slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export function UserAvatar({ userId, displayName, email, size = 40 }: UserAvatarProps) {
  const { hue, pattern, label } = useMemo(() => {
    const hash = hashUserId(userId)
    const hue = HUES[hash % HUES.length]
    const pattern = buildPattern(hash >>> 4)
    const label = initials(displayName, email)
    return { hue, pattern, label }
  }, [userId, displayName, email])

  const cellSize = size / GRID
  const sat = 55 + (hashUserId(userId + 's') % 25)
  const lightBg = 18 + (hashUserId(userId + 'l') % 10)
  const lightFill = 55 + (hashUserId(userId + 'f') % 20)
  const bgColor = `hsl(${hue}, ${sat}%, ${lightBg}%)`
  const fillColor = `hsl(${hue}, ${sat + 10}%, ${lightFill}%)`
  const textColor = `hsl(${hue}, 30%, 85%)`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={displayName ?? email ?? 'User avatar'}
      style={{ borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
    >
      <rect width={size} height={size} rx={size * 0.15} fill={bgColor} />
      {pattern.map((row, ri) =>
        row.map(
          (fill, ci) =>
            fill && (
              <rect
                key={`${ri}-${ci}`}
                x={ci * cellSize}
                y={ri * cellSize}
                width={cellSize}
                height={cellSize}
                rx={cellSize * 0.12}
                fill={fillColor}
              />
            ),
        ),
      )}
      <text
        x={size / 2}
        y={size / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fill={textColor}
        fontFamily="var(--font-display)"
        fontSize={size * 0.35}
        fontWeight={700}
        letterSpacing="0.02em"
      >
        {label}
      </text>
    </svg>
  )
}
