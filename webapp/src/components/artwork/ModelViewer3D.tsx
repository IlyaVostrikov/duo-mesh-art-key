import '@google/model-viewer'
import { createElement, useRef, useEffect, useCallback, useState, type RefObject } from 'react'
import { assetUrl } from '@/lib/asset-url'

type ModelViewerElement = HTMLElement & {
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  // Fullscreen helper — model-viewer exposes enterFullscreen/exitFullscreen when available
  requestFullscreen?: (opts?: FullscreenOptions) => Promise<void>
}

export interface ModelViewer3DProps {
  modelUrl: string
  posterUrl?: string
  className?: string
  style?: React.CSSProperties
  /** Override default camera orbit: "theta phi radius" e.g. "45deg 75deg 2m" */
  cameraOrbit?: string
  /** Override camera target point: "x y z" e.g. "0m 0.5m 0m" */
  cameraTarget?: string
  /** Clamp vertical orbit: "auto auto min max" e.g. "auto auto 45deg 120deg" */
  minCameraOrbit?: string
  maxCameraOrbit?: string
  /** AR: scale ratio (default "auto") */
  arScale?: string
  /** iOS Quick Look USDZ URL (required for AR on iPhone) */
  iosSrc?: string
  /** Show "drag to rotate" prompt on first interaction (default true) */
  interactionPrompt?: boolean
  /** Delay before auto-rotate resumes after user interaction, in ms (default 3000) */
  autoRotateDelay?: number
  /** Exposure value (default 1.1 for slight brightness) */
  exposure?: number
  /** Show fullscreen button (default true) */
  showFullscreen?: boolean
  /** Disable mouse-wheel zoom so page scroll passes through (default false) */
  disableZoom?: boolean
  /** Override environment-image: "neutral" for specular-glossiness models, "" to disable IBL (default "") */
  environmentImage?: string
}

function isViewableFormat(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase()
  return ext === 'glb' || ext === 'gltf'
}

export function ModelViewer3D({
  modelUrl,
  posterUrl,
  className,
  style,
  cameraOrbit,
  cameraTarget,
  minCameraOrbit,
  maxCameraOrbit,
  arScale = 'auto',
  iosSrc,
  interactionPrompt = true,
  autoRotateDelay = 3000,
  exposure = 1.4,
  showFullscreen = true,
  disableZoom = false,
  environmentImage,
}: ModelViewer3DProps) {
  const resolvedModelUrl = assetUrl(modelUrl)
  const resolvedPosterUrl = posterUrl ? assetUrl(posterUrl) : undefined
  const resolvedIosSrc = iosSrc ? assetUrl(iosSrc) : undefined

  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ModelViewerElement>(null) as RefObject<ModelViewerElement>
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ─── Fullscreen toggle ───
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        // Try model-viewer's native fullscreen first (handles AR/etc better)
        const viewer = viewerRef.current
        if (viewer?.requestFullscreen) {
          await viewer.requestFullscreen({ navigationUI: 'hide' })
        } else {
          await container.requestFullscreen({ navigationUI: 'hide' })
        }
      }
    } catch {
      // Fullscreen denied — silently ignore (common on mobile browsers)
    }
  }, [])

  // Listen for fullscreen changes (user may press Esc)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ─── Non-viewable format fallback ───
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
                color: 'var(--accent-ink)',
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

  // ─── Set attributes on mount/change ───
  useEffect(() => {
    const el = viewerRef.current
    if (!el) return

    // Source
    el.setAttribute('src', resolvedModelUrl)
    if (resolvedPosterUrl) el.setAttribute('poster', resolvedPosterUrl)
    el.setAttribute('loading', 'lazy')
    el.setAttribute('reveal', 'auto')

    // ─── Light & Materials ───
    // Only override when explicitly provided; otherwise let model-viewer use its
    // built-in default (works for both standard PBR and specular-glossiness).
    if (environmentImage !== undefined) {
      el.setAttribute('environment-image', environmentImage)
    }
    el.setAttribute('tone-mapping', 'aces')
    el.setAttribute('exposure', String(exposure))
    el.setAttribute('shadow-intensity', '1.2')
    el.setAttribute('shadow-softness', '0.6')

    // ─── Controls & Presentation (Task 3) ───
    el.setAttribute('camera-controls', '')
    if (disableZoom) {
      el.setAttribute('disable-zoom', '')
    } else {
      el.removeAttribute('disable-zoom')
    }
    el.setAttribute('auto-rotate', '')
    el.setAttribute('rotation-per-second', '15deg')
    el.setAttribute('auto-rotate-delay', String(autoRotateDelay))
    if (interactionPrompt) {
      el.setAttribute('interaction-prompt', 'auto')
    } else {
      el.removeAttribute('interaction-prompt')
    }

    // Camera orbit
    if (cameraOrbit) {
      el.setAttribute('camera-orbit', cameraOrbit)
    } else {
      // Default: slightly elevated, angled for a "gallery pedestal" look
      el.setAttribute('camera-orbit', '30deg 75deg 2.5m')
    }
    if (cameraTarget) el.setAttribute('camera-target', cameraTarget)

    // Orbit limits — prevent flipping under floor or into void
    if (minCameraOrbit) {
      el.setAttribute('min-camera-orbit', minCameraOrbit)
    } else {
      el.setAttribute('min-camera-orbit', 'auto auto 45deg auto')
    }
    if (maxCameraOrbit) {
      el.setAttribute('max-camera-orbit', maxCameraOrbit)
    } else {
      el.setAttribute('max-camera-orbit', 'auto auto 120deg auto')
    }

    // ─── AR (Task 4) ───
    el.setAttribute('ar', '')
    el.setAttribute('ar-modes', 'webxr scene-viewer quick-look')
    el.setAttribute('ar-placement', 'floor')
    el.setAttribute('ar-scale', arScale)
    if (resolvedIosSrc) {
      el.setAttribute('ios-src', resolvedIosSrc)
    }
  }, [
    resolvedModelUrl, resolvedPosterUrl, resolvedIosSrc,
    cameraOrbit, cameraTarget, minCameraOrbit, maxCameraOrbit,
    arScale, interactionPrompt, autoRotateDelay, exposure,
    disableZoom, environmentImage,
  ])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: isFullscreen ? '100vh' : '400px',
        backgroundColor: isFullscreen ? '#000' : 'var(--bg)',
        overflow: 'hidden',
        contain: 'paint',
        ...style,
      }}
    >
      {createElement('model-viewer', {
        ref: viewerRef,
        style: {
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          '--poster-color': 'transparent',
        } as React.CSSProperties,
      })}

      {/* Fullscreen button (Task 2) */}
      {showFullscreen && (
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
          title={isFullscreen ? 'Выйти / Exit' : 'На весь экран / Fullscreen'}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 10,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {isFullscreen ? (
            // Exit fullscreen icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            // Enter fullscreen icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      )}

      {/* Close button overlay in fullscreen */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          aria-label="Close fullscreen"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
