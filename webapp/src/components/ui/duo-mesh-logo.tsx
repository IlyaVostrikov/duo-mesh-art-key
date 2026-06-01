/** Seal of authenticity — circle + inscribed square, monochrome. */
export function LogoSeal({ size = 48 }: { size?: number }) {
  const c = size / 2
  const r = size * 0.395
  const d = r * 0.92
  const sw = Math.max(1, Math.round(size / 24))

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-label="DUO MESH"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth={sw} />
      <polygon
        points={`${c},${c - d} ${c + d},${c} ${c},${c + d} ${c - d},${c}`}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/** Lockup: seal + DUO MESH wordmark, optically aligned. */
export function LogoLockup({ size = 48 }: { size?: number }) {
  const gap = size * 0.18
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: `${gap}px` }}>
      <LogoSeal size={size} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: `${size}px`,
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text)',
          lineHeight: 1,
        }}
      >
        DUO MESH
      </span>
    </div>
  )
}
