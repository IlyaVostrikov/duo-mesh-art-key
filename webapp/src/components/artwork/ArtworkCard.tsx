import { Link } from '@tanstack/react-router'

interface ArtworkCardProps {
  id: string
  title: string
  artistName: string
  posterUrl: string
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  price?: string | null
  currency?: string
  status?: string
  aspectRatio?: '4:5' | 'auto'
}

const STATUS_LABELS: Record<string, string> = {
  SOLD: 'Продано',
  RESERVED: 'Резерв',
  IN_EXHIBITION: 'На выставке',
}

export function ArtworkCard({
  id,
  title,
  artistName,
  posterUrl,
  mediaType,
  price,
  currency = 'RUB',
  status,
  aspectRatio = '4:5',
}: ArtworkCardProps) {
  const is3D = mediaType === 'MODEL_3D'
  const statusLabel = status ? STATUS_LABELS[status] : null
  const russianTitle = title.split(' / ')[0]

  const priceDisplay = price
    ? currency === 'RUB'
      ? `${Number(price).toLocaleString('ru-RU')} ₽`
      : `$${Number(price).toLocaleString('en-US')}`
    : null

  return (
    <Link
      to="/artwork/$artworkId"
      params={{ artworkId: id }}
      className="group block"
      style={{ textDecoration: 'none', transition: 'transform 250ms cubic-bezier(0.2,0,0,1)' }}
    >
      {/* Poster */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'var(--surface)',
          aspectRatio: aspectRatio === '4:5' ? '4/5' : undefined,
          borderRadius: 'var(--radius)',
          boxShadow: '0 0 0 1px var(--border)',
          transition: 'box-shadow 250ms cubic-bezier(0.2,0,0,1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent), 0 0 28px rgba(var(--highlight-rgb),0.07)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 1px var(--border)'
        }}
      >
        <img
          src={posterUrl}
          alt={russianTitle}
          loading="lazy"
          className="group-hover:scale-[1.025]"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: 0,
            transition: 'opacity 400ms cubic-bezier(0.2,0,0,1), transform 400ms cubic-bezier(0.2,0,0,1)',
          }}
          onLoad={(e) => { e.currentTarget.style.opacity = '1' }}
        />

        {is3D && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '2px 8px',
              fontFamily: 'var(--font-brand)',
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600,
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            3D
          </span>
        )}

        {statusLabel && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '2px 8px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              backgroundColor: 'rgba(11,11,13,0.75)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div style={{ marginTop: '10px', display: 'grid', gap: '2px' }}>
        <h3
          className="group-hover:text-accent"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 200ms cubic-bezier(0.2,0,0,1)',
          }}
        >
          {russianTitle}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          {artistName}
        </p>
        {priceDisplay && (
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              margin: '3px 0 0',
            }}
          >
            {priceDisplay}
          </p>
        )}
      </div>
    </Link>
  )
}

export function ArtworkCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div style={{ aspectRatio: '4/5', background: 'var(--surface)', borderRadius: 'var(--radius)' }} />
      <div style={{ marginTop: '10px', display: 'grid', gap: '5px' }}>
        <div style={{ height: '15px', width: '60%', background: 'var(--surface)', borderRadius: '2px' }} />
        <div style={{ height: '11px', width: '40%', background: 'var(--surface)', borderRadius: '2px' }} />
      </div>
    </div>
  )
}
