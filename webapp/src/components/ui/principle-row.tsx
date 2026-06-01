interface PrincipleRowProps {
  index: string
  title: string
  description: string
  isLast?: boolean
}

export function PrincipleRow({ index, title, description, isLast }: PrincipleRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr 2fr',
        gap: '0 48px',
        padding: '28px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        alignItems: 'start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-brand)',
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          paddingTop: '3px',
        }}
      >
        {index}
      </span>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.95rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
          margin: 0,
          paddingTop: '2px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.9rem',
          lineHeight: 1.65,
          color: 'var(--text-muted)',
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  )
}
