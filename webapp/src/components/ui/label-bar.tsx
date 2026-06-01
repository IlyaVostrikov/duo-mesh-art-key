interface LabelBarProps {
  left: string
  right: string
}

export function LabelBar({ left, right }: LabelBarProps) {
  return (
    <div className="relative z-10 mb-10 flex items-center justify-between border-b border-border pb-4">
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.65rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {left}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
        }}
      >
        {right}
      </span>
    </div>
  )
}
