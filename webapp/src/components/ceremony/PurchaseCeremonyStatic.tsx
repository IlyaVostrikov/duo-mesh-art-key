import { useEffect, useState } from 'react'
import { VerifiedBadge } from '@/components/ui/verified-badge'
import { assetUrl } from '@/lib/asset-url'
import type { CeremonyData } from './types'

interface Props {
  data: CeremonyData
  onComplete: () => void
}

export function PurchaseCeremonyStatic({ data, onComplete }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDismissed(true), 3500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (dismissed) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }
  }, [dismissed, onComplete])

  return (
    <div
      onClick={() => setDismissed(true)}
      style={{
        position: 'fixed', inset: 0, zIndex: 99995,
        backgroundColor: 'rgba(13,13,15,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', cursor: 'pointer',
        opacity: dismissed ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px', width: '100%',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--elev-2)',
          padding: '32px', textAlign: 'center',
          cursor: 'default',
        }}
      >
        {data.artworkPosterUrl && (
          <img
            src={assetUrl(data.artworkPosterUrl)}
            alt={data.artworkTitle}
            style={{
              maxWidth: '200px', maxHeight: '200px', borderRadius: 'var(--radius)',
              marginBottom: '20px', objectFit: 'contain',
            }}
          />
        )}

        <h2 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
          Приобретено / Acquired
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '20px' }}>
          {data.artworkTitle}
        </p>

        <div style={{
          padding: '12px', borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg)', marginBottom: '16px',
        }}>
          <code className="font-mono" style={{ fontSize: '1.0625rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
            {data.keyCode}
          </code>
        </div>

        {data.verified ? (
          <div style={{ marginBottom: '16px' }}>
            <VerifiedBadge />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px' }}>
              Криптографически подтверждено / Cryptographically Verified
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '16px' }}>
            Verification data unavailable
          </p>
        )}

        <div style={{
          padding: '8px', borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg)',
        }}>
          <code className="font-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            {data.transfer.recordHash.slice(0, 32)}...
          </code>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '20px' }}>
          Нажмите чтобы закрыть / Click to close
        </p>
      </div>
    </div>
  )
}
