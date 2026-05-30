/*
  DESIGN V2 — ArtworkCard
  Заменяет: src/components/artwork/ArtworkCard.tsx

  Изменения:
  - Убран mixBlendMode: lighten hover (давал белесый засвет)
  - Убран glow border (слишком flashy)
  - Hover: тонкая рамка цвета accent — строго и чисто
  - Типографика: Cormorant italic для названия (как в галерее)
  - Начальный opacity: 0 для реального fade-in при загрузке
  - Фиксирован баг: text-display-sm → правильный класс
*/
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
      style={{ textDecoration: 'none', transition: `transform 250ms cubic-bezier(0.2, 0, 0, 1)` }}
    >
      {/* Постер */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface)',
          aspectRatio: aspectRatio === '4:5' ? '4/5' : undefined,
          outline: '1px solid transparent',
          transition: 'outline-color 250ms cubic-bezier(0.2, 0, 0, 1)',
        }}
        className="group-hover:[outline-color:var(--accent)]"
      >
        <img
          src={posterUrl}
          alt={russianTitle}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0,
            transition: 'opacity 400ms cubic-bezier(0.2, 0, 0, 1), transform 400ms cubic-bezier(0.2, 0, 0, 1)',
            display: 'block',
          }}
          className="group-hover:scale-[1.02]"
          onLoad={(e) => { e.currentTarget.style.opacity = '1' }}
        />

        {/* 3D Badge */}
        {is3D && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '2px 8px',
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
            }}
          >
            3D
          </span>
        )}

        {/* Status badge */}
        {statusLabel && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '2px 8px',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Метаданные — стиль музейной этикетки */}
      <div style={{ marginTop: '12px', display: 'grid', gap: '3px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-editorial)',
            fontStyle: 'italic',
            fontSize: '1.15rem',
            lineHeight: 1.3,
            color: 'var(--text)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 250ms cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="group-hover:text-accent"
        >
          {russianTitle}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          {artistName}
        </p>
        {priceDisplay && (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              margin: 0,
              marginTop: '4px',
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
      <div
        style={{
          aspectRatio: '4/5',
          background: 'var(--surface)',
        }}
      />
      <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
        <div style={{ height: '18px', width: '65%', background: 'var(--surface)', borderRadius: '1px' }} />
        <div style={{ height: '12px', width: '40%', background: 'var(--surface)', borderRadius: '1px' }} />
      </div>
    </div>
  )
}
