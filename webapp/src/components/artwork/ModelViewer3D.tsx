import '@google/model-viewer'
import { createElement, useRef, useEffect, type RefObject } from 'react'
import { assetUrl } from '@/lib/asset-url'

type ModelViewerElement = HTMLElement & {
  setAttribute(name: string, value: string): void
}

interface ModelViewer3DProps {
  modelUrl: string
  posterUrl?: string
  className?: string
  style?: React.CSSProperties
}

function isViewableFormat(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase()
  return ext === 'glb' || ext === 'gltf'
}

export function ModelViewer3D({ modelUrl, posterUrl, className, style }: ModelViewer3DProps) {
  const resolvedModelUrl = assetUrl(modelUrl)
  const resolvedPosterUrl = posterUrl ? assetUrl(posterUrl) : undefined

  if (!isViewableFormat(modelUrl)) {
    const ext = modelUrl.split('.').pop()?.toUpperCase() ?? ''
    const isSafe = /^https?:\/\//i.test(resolvedModelUrl)

    return (
      <div
        className={className}
        style={{
          ...style,
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '40px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
        }}
      >
        {resolvedPosterUrl && (
          <img
            src={resolvedPosterUrl}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '45%', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
          />
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.875rem' }}>
            Этот формат требует внешнего просмотрщика / This format requires an external viewer
          </p>
          {isSafe ? (
            <a
              href={resolvedModelUrl}
              download
              rel="noreferrer noopener"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                backgroundColor: 'var(--accent)',
                color: '#000',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Скачать / Download {ext}
            </a>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Недоступно для скачивания / Download unavailable
            </span>
          )}
        </div>
      </div>
    )
  }

  const ref = useRef<ModelViewerElement>(null) as RefObject<ModelViewerElement>

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.setAttribute('src', resolvedModelUrl)
    if (resolvedPosterUrl) el.setAttribute('poster', resolvedPosterUrl)
    el.setAttribute('camera-controls', '')
    el.setAttribute('auto-rotate', '')
    el.setAttribute('rotation-per-second', '20deg')
    el.setAttribute('ar', '')
    el.setAttribute('ar-modes', 'webxr scene-viewer quick-look')
    el.setAttribute('shadow-intensity', '1')
    el.setAttribute('exposure', '1')
    el.setAttribute('environment-image', 'neutral')
    el.setAttribute('loading', 'lazy')
    el.setAttribute('reveal', 'auto')
  }, [resolvedModelUrl, resolvedPosterUrl])

  return createElement('model-viewer', {
    ref,
    className,
    style: { width: '100%', height: '100%', minHeight: '400px', ...style },
  })
}
