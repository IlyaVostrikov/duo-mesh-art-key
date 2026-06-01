interface GalleryHeaderProps {
  title: string
  subtitle: string
  count?: number
}

function pluralize(count: number): string {
  if (count === 1) return 'работа'
  if (count < 5) return 'работы'
  return 'работ'
}

export function GalleryHeader({ title, subtitle, count }: GalleryHeaderProps) {
  return (
    <header style={{ padding: '64px 0 48px' }}>
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-editorial m-0 text-foreground">
            {title}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              margin: '8px 0 0',
            }}
          >
            {subtitle}
          </p>
        </div>
        {count !== undefined && count > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {count} {pluralize(count)}
          </span>
        )}
      </div>
    </header>
  )
}
