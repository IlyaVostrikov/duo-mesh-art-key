interface MuseumLabelProps {
  artistName: string
  medium?: string | null
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
}

export function MuseumLabel({ artistName, medium, mediaType }: MuseumLabelProps) {
  return (
    <div
      className="flex items-start justify-between"
      style={{ marginTop: '14px', padding: '0 2px' }}
    >
      <div>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          {artistName}
        </p>
        {medium && (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.03em',
              margin: '3px 0 0',
            }}
          >
            {medium}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-brand)',
          fontSize: '0.6rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}
      >
        {mediaType === 'MODEL_3D' ? '3D' : '2D'}
      </span>
    </div>
  )
}
