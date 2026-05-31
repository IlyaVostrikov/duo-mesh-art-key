import { useState } from 'react'
import { assetUrl } from '@/lib/asset-url'
import type { HallArtwork } from './types'

export function HallSlotCell({
  index,
  assigned,
  onDrop,
  onRemove,
}: {
  index: number
  assigned: HallArtwork | null
  onDrop: (artworkId: string) => void
  onRemove: () => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const id = e.dataTransfer.getData('text/artwork-id')
        if (id) onDrop(id)
      }}
      style={{
        aspectRatio: '3/4',
        minHeight: '100px',
        borderRadius: 'var(--radius-sm)',
        border: dragOver
          ? '2px dashed var(--accent)'
          : '1px dashed var(--border)',
        backgroundColor: dragOver ? 'rgba(198,255,58,0.05)' : assigned ? 'var(--surface)' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {assigned ? (
        <>
          <img
            src={assigned.posterUrl ? assetUrl(assigned.posterUrl) : '/placeholder-artwork.svg'}
            alt={assigned.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '6px 8px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}>
            <p style={{ fontSize: '0.65rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
              {assigned.title.split(' / ')[0]}
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--accent)', margin: 0 }}>
              {assigned.mediaType === 'MODEL_3D' ? '3D' : '2D'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="Убрать / Remove"
            style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '20px', height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '0.65rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center' }}>
          Слот {index + 1}<br />
          <span style={{ color: 'var(--text-disabled)' }}>drop artwork</span>
        </span>
      )}
    </div>
  )
}
