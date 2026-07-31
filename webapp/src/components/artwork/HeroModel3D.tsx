import { Suspense, useState, useCallback, useRef, useEffect, useMemo, lazy, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, useProgress, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { detectWebGL } from '@/hooks/useWebGLAvailable'
import { assetUrl } from '@/lib/asset-url'
import * as THREE from 'three'

// ─── Model loader + scene ───

interface ModelSceneProps {
  modelUrl: string
  autoRotate?: boolean
  autoRotateSpeed?: number
  autoRotateDelay?: number
  cameraOrbitMin?: number
  cameraOrbitMax?: number
  disableZoom?: boolean
  resetKey?: number
  onContextLost?: () => void
  onContextRestored?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

function ModelScene({
  modelUrl,
  autoRotate = true,
  autoRotateSpeed = 0.4,
  autoRotateDelay = 3,
  cameraOrbitMin = Math.PI / 4,
  cameraOrbitMax = (Math.PI * 2) / 3,
  disableZoom = false,
  resetKey = 0,
  onContextLost,
  onContextRestored,
  onDragStart,
  onDragEnd,
}: ModelSceneProps) {
  const { scene } = useGLTF(modelUrl)
  const controlsRef = useRef<any>(null)
  const interactionTimer = useRef(0)
  const { gl, camera } = useThree()

  // Ground model: clone, center XZ, place bottom on Y=0 floor
  const groundedModel = useMemo(() => {
    const cloned = scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.set(-center.x, -box.min.y, -center.z)
    return cloned
  }, [scene])

  // Camera auto-fit from bounding sphere
  const orbitTarget = useMemo(() => {
    const box = new THREE.Box3().setFromObject(groundedModel)
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    return sphere.center.clone()
  }, [groundedModel])

  useEffect(() => {
    const pcam = camera as THREE.PerspectiveCamera
    const box = new THREE.Box3().setFromObject(groundedModel)
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    // Position camera to fit sphere with 40% margin
    const fovRad = (pcam.fov * Math.PI) / 180
    const dist = (sphere.radius * 1.4) / Math.tan(fovRad / 2)
    pcam.position.set(0, sphere.center.y, dist)
    pcam.near = Math.max(0.01, sphere.radius * 0.01)
    pcam.far = Math.max(10, dist * 5)
    pcam.updateProjectionMatrix()
  }, [camera, groundedModel])

  // Reset camera to initial auto-fit position on resetKey change
  useEffect(() => {
    if (resetKey === 0) return
    const pcam = camera as THREE.PerspectiveCamera
    const box = new THREE.Box3().setFromObject(groundedModel)
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    const fovRad = (pcam.fov * Math.PI) / 180
    const dist = (sphere.radius * 1.4) / Math.tan(fovRad / 2)
    pcam.position.set(0, sphere.center.y, dist)
    pcam.lookAt(sphere.center)
    if (controlsRef.current) {
      controlsRef.current.target.copy(sphere.center)
      controlsRef.current.update()
    }
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Context loss handling
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      onContextLost?.()
    }
    const onRestored = () => {
      onContextRestored?.()
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl, onContextLost, onContextRestored])

  // Auto-rotate timer on user interaction
  useFrame((_, dt) => {
    if (!controlsRef.current || !autoRotate) return
    if (interactionTimer.current > 0) {
      interactionTimer.current -= dt
      controlsRef.current.autoRotate = false
    } else {
      controlsRef.current.autoRotate = true
      controlsRef.current.autoRotateSpeed = autoRotateSpeed
    }
  })

  const handleStart = useCallback(() => {
    interactionTimer.current = autoRotateDelay
    onDragStart?.()
  }, [autoRotateDelay, onDragStart])

  const handleEnd = useCallback(() => {
    onDragEnd?.()
  }, [onDragEnd])

  // Drop resolution during camera movement (regress) — restores when idle
  const regress = useThree((s) => s.performance.regress)
  useEffect(() => {
    const el = gl.domElement
    // pointer events: user starts/stops interacting
    const onDown = () => regress()
    el.addEventListener('pointerdown', onDown)
    return () => el.removeEventListener('pointerdown', onDown)
  }, [gl, regress])

  return (
    <>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight position={[5, 8, 5]} intensity={2.5} color="#ffffff" castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.6} color="#c8d6ff" />

      <Environment preset="studio" />

      <primitive object={groundedModel} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enableDamping
        enableZoom={!disableZoom}
        enablePan={false}
        minPolarAngle={cameraOrbitMin}
        maxPolarAngle={cameraOrbitMax}
        target={orbitTarget.toArray() as [number, number, number]}
        onStart={handleStart}
        onEnd={handleEnd}
      />
    </>
  )
}

// ─── Lazy postprocessing (code-split from main bundle) ───

const PostProcessOverlayLazy = lazy(() =>
  import('./PostProcessOverlay').then((m) => ({ default: m.PostProcessOverlay })),
)

// ─── Viewer toolbar (icons overlayed on the 3D canvas) ───

interface ViewerToolbarProps {
  autoRotate: boolean
  effectsOn: boolean
  hasPostprocessing: boolean
  onReset: () => void
  onToggleRotate: () => void
  onToggleEffects: () => void
}

const toolbarBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  backgroundColor: 'rgba(0,0,0,0.45)',
  color: 'rgba(255,255,255,0.8)',
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  transition: 'all 0.2s ease',
}

function ViewerToolbar({
  autoRotate,
  effectsOn,
  hasPostprocessing,
  onReset,
  onToggleRotate,
  onToggleEffects,
}: ViewerToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 10,
        display: 'flex',
        gap: 8,
      }}
    >
      {/* Reset view */}
      <button
        onClick={onReset}
        aria-label="Reset view"
        title="Сбросить камеру / Reset view"
        style={toolbarBtn}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      {/* Auto-rotate toggle */}
      <button
        onClick={onToggleRotate}
        aria-label={autoRotate ? 'Pause rotation' : 'Auto-rotate'}
        title={autoRotate ? 'Остановить вращение / Stop rotation' : 'Авто-вращение / Auto-rotate'}
        style={{
          ...toolbarBtn,
          color: autoRotate ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
        }}
      >
        {autoRotate ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="6,3 20,12 6,21" />
          </svg>
        )}
      </button>

      {/* Postprocessing toggle */}
      {hasPostprocessing && (
        <button
          onClick={onToggleEffects}
          aria-label={effectsOn ? 'Disable effects' : 'Enable effects'}
          title={effectsOn ? 'Эффекты вкл / Effects on' : 'Эффекты выкл / Effects off'}
          style={{
            ...toolbarBtn,
            color: effectsOn ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Loading overlay ───

function LoadingOverlay({ posterUrl, loaded }: { posterUrl?: string; loaded: boolean }) {
  if (loaded) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
      }}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt="Preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: 'rgba(255,255,255,0.8)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Progress tracker ───

function ModelLoadTracker({ onLoad }: { onLoad: () => void }) {
  const { active } = useProgress()
  useEffect(() => {
    if (!active) onLoad()
  }, [active, onLoad])
  return null
}

// ─── Error boundary: catches useGLTF failures (404, network, parse) ───

class ModelLoadErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onError: () => void; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.warn('3D model load failed:', error.message)
    this.props.onError()
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

// ─── Public API ───

export interface HeroModel3DProps {
  modelUrl: string
  posterUrl?: string
  className?: string
  style?: React.CSSProperties
  exposure?: number
  disableZoom?: boolean
  showFullscreen?: boolean
  postprocessing?: boolean
}

export function HeroModel3D({
  modelUrl,
  posterUrl,
  className,
  style,
  exposure = 1.4,
  disableZoom = false,
  showFullscreen = true,
  postprocessing = false,
}: HeroModel3DProps) {
  const reduced = useReducedMotion()
  const resolvedModelUrl = assetUrl(modelUrl)
  const resolvedPosterUrl = posterUrl ? assetUrl(posterUrl) : undefined
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [contextKey, setContextKey] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(!reduced)
  const [effectsOn, setEffectsOn] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const caps = detectWebGL()

  // Force visible cursor: CustomCursor component sets cursor:none!important
  // globally, but the 3D viewer needs grab/grabbing for OrbitControls.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const enforce = () => el.style.setProperty('cursor', 'grab', 'important')
    enforce()
    const obs = new MutationObserver(enforce)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Toolbar handlers
  const handleResetView = useCallback(() => setResetKey((k) => k + 1), [])
  const handleToggleRotate = useCallback(() => setAutoRotate((v) => !v), [])
  const handleToggleEffects = useCallback(() => setEffectsOn((v) => !v), [])
  const onDragStart = useCallback(() => {}, [])
  const onDragEnd = useCallback(() => {}, [])

  // Fullscreen listener
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch { /* denied — ignore */ }
  }, [])

  const handleContextLost = useCallback(() => {
    setContextLost(true)
  }, [])

  const handleContextRestored = useCallback(() => {
    setContextKey((k) => k + 1)
    setContextLost(false)
  }, [])

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => {
    setError(true)
    setLoaded(true)
  }, [])

  // No WebGL → static poster fallback
  if (!caps.available) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
          backgroundColor: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {resolvedPosterUrl ? (
          <img src={resolvedPosterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            WebGL недоступен / WebGL unavailable
          </p>
        )}
      </div>
    )
  }

  const postprocessingActive = postprocessing && effectsOn

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        background: 'radial-gradient(ellipse at 50% 50%, #f0edf4 0%, #e8e4ed 100%)',
        overflow: 'hidden',
        cursor: 'grab',
        ...style,
      }}
      data-lenis-prevent
    >
      {/* Context loss banner */}
      {contextLost && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.875rem',
          }}
        >
          {resolvedPosterUrl ? (
            <img src={resolvedPosterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
          ) : null}
          <span style={{ position: 'absolute' }}>
            Восстановление контекста / Restoring context...
          </span>
        </div>
      )}

      {error ? (
        /* Model failed to load — poster fallback */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
          }}
        >
          {resolvedPosterUrl ? (
            <img
              src={resolvedPosterUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
              3D модель недоступна / 3D model unavailable
            </p>
          )}
        </div>
      ) : (
        <>
          <Canvas
            key={contextKey}
            dpr={postprocessingActive
              ? [1, 1.5] as [number, number]
              : caps.tier <= 1 ? [1, 1.5] as [number, number] : [1, 2]}
            performance={{ min: 0.5 }}
            gl={{
              alpha: true,
              antialias: !postprocessingActive && caps.tier >= 2,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: exposure,
              outputColorSpace: THREE.SRGBColorSpace,
              preserveDrawingBuffer: true,
            }}
            frameloop="demand"
            style={{ position: 'relative', zIndex: 0, width: '100%', height: '100%', cursor: 'grab' }}
          >
            <Suspense fallback={null}>
              <ModelLoadErrorBoundary onError={handleError}>
                <ModelLoadTracker onLoad={handleLoad} />
                <ModelScene
                  modelUrl={resolvedModelUrl}
                  autoRotate={autoRotate}
                  resetKey={resetKey}
                  disableZoom={disableZoom}
                  onContextLost={handleContextLost}
                  onContextRestored={handleContextRestored}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                {postprocessing && effectsOn && (
                  <Suspense fallback={null}>
                    <PostProcessOverlayLazy />
                  </Suspense>
                )}
              </ModelLoadErrorBoundary>
            </Suspense>
          </Canvas>

          <LoadingOverlay posterUrl={resolvedPosterUrl} loaded={loaded} />

          {/* Viewer toolbar — model interaction controls */}
          <ViewerToolbar
            autoRotate={autoRotate}
            effectsOn={effectsOn}
            hasPostprocessing={postprocessing}
            onReset={handleResetView}
            onToggleRotate={handleToggleRotate}
            onToggleEffects={handleToggleEffects}
          />

          {/* Fullscreen button */}
          {showFullscreen && (
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                borderRadius: 8,
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease',
              }}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          )}

          {/* Close button in fullscreen */}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              aria-label="Close fullscreen"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                width: 44,
                height: 44,
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
              }}
            >
              ✕
            </button>
          )}
        </>
      )}
    </div>
  )
}
