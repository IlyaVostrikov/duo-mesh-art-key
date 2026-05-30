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
  SOLD: 'Продано / Sold',
  RESERVED: 'Резерв / Reserved',
  IN_EXHIBITION: 'На выставке / In Exhibition',
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
      style={{
        transition: `transform var(--dur) var(--ease)`,
      }}
    >
      {/* Poster container */}
      <div
        className="relative overflow-hidden bg-[var(--surface)]"
        style={{
          aspectRatio: aspectRatio === '4:5' ? '4/5' : undefined,
          borderRadius: 'var(--radius)',
        }}
      >
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.03]"
          loading="lazy"
          style={{
            transition: `opacity var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)`,
          }}
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        />

        {/* Glow border on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 0 1px var(--accent), 0 0 30px rgba(198,255,58,0.06)',
            transition: `opacity var(--dur) var(--ease)`,
            borderRadius: 'var(--radius)',
          }}
        />

        {/* Hover overlay — surface lift on group hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: 'var(--surface-2)',
            mixBlendMode: 'lighten',
            transition: `opacity var(--dur) var(--ease)`,
            borderRadius: 'var(--radius)',
          }}
        />

        {/* 3D Badge */}
        {is3D && (
          <span
            className="absolute top-3 left-3 z-10 px-2 py-0.5 text-xs font-semibold tracking-wider uppercase"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            3D
          </span>
        )}

        {/* Status badge (SOLD, etc.) */}
        {statusLabel && (
          <span
            className="absolute top-3 right-3 z-10 px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="mt-3 space-y-1">
        <h3
          className="text-display-sm truncate group-hover:text-accent"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            lineHeight: 1.3,
            color: 'var(--text)',
            transition: `color var(--dur) var(--ease)`,
          }}
        >
          {title.split(' / ')[0]}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {artistName}
        </p>
        {priceDisplay && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
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
      <div
        className="bg-[var(--surface)]"
        style={{ aspectRatio: '4/5', borderRadius: 'var(--radius)' }}
      />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 bg-[var(--surface)] rounded" />
        <div className="h-3 w-1/2 bg-[var(--surface)] rounded" />
      </div>
    </div>
  )
}
