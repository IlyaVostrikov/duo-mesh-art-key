import { useState } from 'react'
import { assetUrl } from '@/lib/asset-url'
import type { HallArtwork } from './types'

export function HallArtworkChip({ artwork }: { artwork: HallArtwork }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/artwork-id', artwork.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        cursor: 'grab',
        opacity: dragging ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <img
        src={artwork.posterUrl ? assetUrl(artwork.posterUrl) : '/placeholder-artwork.svg'}
        alt=""
        style={{ width: '36px', height: '36px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.7rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {artwork.title.split(' / ')[0]}
        </p>
        <span style={{
          fontSize: '0.6rem',
          padding: '1px 5px',
          borderRadius: '3px',
          backgroundColor: artwork.mediaType === 'MODEL_3D' ? 'rgba(var(--accent-rgb),0.1)' : 'rgba(96,165,250,0.1)',
          color: artwork.mediaType === 'MODEL_3D' ? 'var(--accent)' : '#60a5fa',
        }}>
          {artwork.mediaType === 'MODEL_3D' ? '3D' : '2D'}
        </span>
      </div>
    </div>
  )
}
