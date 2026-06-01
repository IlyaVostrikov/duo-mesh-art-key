import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useLenis } from '@/components/motion/LenisProvider'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { GalleryWall } from './GalleryWall'
import { GalleryFloor } from './GalleryFloor'
import { GalleryCeiling } from './GalleryCeiling'
import { FramedArtwork } from './FramedArtwork'
import { PedestalSculpture } from './PedestalSculpture'
import type { SlotLayout } from './layoutTemplates'
import type { Hall3DArtwork } from './Hall3DScene'
import * as THREE from 'three'


const WALL_WIDTH = 10
const WALL_HEIGHT = 4.2
const FLOOR_DEPTH = 8
const EYE = 1.55
const FOV = 42
const CAMERA_Z_FAR = 5.5
const CAMERA_Z_NEAR = 1.2
const SCROLL_HEIGHT_VH = 120
const LERP_SPEED = 4.5
const MOUSE_YAW_DEG = 22 // ±22° yaw from mouse
const MOUSE_PITCH_DEG = 6 // ±6° pitch from mouse

function toRad(deg: number) { return THREE.MathUtils.degToRad(deg) }

// ─── Texture preloader ───

function useTextureCache(urls: (string | null)[]) {
  const [cache, setCache] = useState<Map<string, THREE.Texture | null>>(new Map())

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const next = new Map(cache)
    let cancelled = false

    for (const url of urls) {
      if (!url || next.has(url)) continue
      next.set(url, null)
      loader.load(
        url,
        (tex) => {
          if (!cancelled) {
            tex.colorSpace = THREE.SRGBColorSpace
            setCache((prev) => { const n = new Map(prev); n.set(url, tex); return n })
          }
        },
        undefined,
        () => {
          if (!cancelled) {
            setCache((prev) => { const n = new Map(prev); n.set(url, null); return n })
          }
        },
      )
    }

    return () => { cancelled = true }
  }, [urls.filter(Boolean).join(',')])

  return cache
}

// ─── Scene content ───

interface SceneContentProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  textureCache: Map<string, THREE.Texture | null>
  hoveredId: string | null
  onHover: (id: string | null) => void
  onClick: (id: string) => void
  scrollProgress: number
  mouseNorm: { x: number; y: number }
  enableParallax: boolean
  theme?: string | null
}

function SceneContent({
  artworks, layout, textureCache, hoveredId, onHover, onClick,
  scrollProgress, mouseNorm, enableParallax, theme,
}: SceneContentProps) {
  const camRef = useRef<THREE.PerspectiveCamera>(null!)
  const currentYaw = useRef(0)
  const currentPitch = useRef(0)
  const currentZ = useRef(CAMERA_Z_FAR)

  // Init camera once
  const { camera } = useThree()
  useEffect(() => {
    const pcam = camera as THREE.PerspectiveCamera
    pcam.position.set(0, EYE, CAMERA_Z_FAR)
    pcam.fov = FOV
    pcam.near = 0.1
    pcam.far = 40
    pcam.lookAt(0, EYE, 0)
    pcam.updateProjectionMatrix()
    camRef.current = pcam
    currentZ.current = CAMERA_Z_FAR
  }, [camera])

  // Animate camera: Z-dolly from scroll, yaw/pitch from mouse parallax
  useFrame((_, dt) => {
    if (!camRef.current) return
    const pcam = camRef.current

    // Scroll → Z position (clamped)
    const targetZ = THREE.MathUtils.lerp(CAMERA_Z_FAR, CAMERA_Z_NEAR, scrollProgress)
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, LERP_SPEED * dt))
    const z = currentZ.current

    // Mouse → yaw/pitch target
    const targetYaw = enableParallax ? mouseNorm.x * toRad(MOUSE_YAW_DEG) : 0
    const targetPitch = enableParallax ? mouseNorm.y * toRad(MOUSE_PITCH_DEG) : 0
    currentYaw.current = THREE.MathUtils.lerp(currentYaw.current, targetYaw, Math.min(1, 3 * dt))
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch, Math.min(1, 3 * dt))

    // Compute lookAt from yaw/pitch offsets
    const yaw = currentYaw.current
    const pitch = currentPitch.current
    const lookX = z * Math.tan(yaw)
    const lookY = EYE + z * Math.tan(pitch)
    const lookZ = 0

    pcam.position.set(
      z * Math.tan(yaw) * 0.08, // subtle lateral shift for parallax feel
      EYE + z * Math.tan(pitch) * 0.08,
      z,
    )
    pcam.lookAt(lookX, lookY, lookZ)
  })

  const slottedArtworks = useMemo(() => {
    const result: Array<{ artwork: Hall3DArtwork; slot: SlotLayout['slots'][number] }> = []
    artworks.forEach((aw, i) => {
      if (i < layout.slots.length) result.push({ artwork: aw, slot: layout.slots[i] })
    })
    return result
  }, [artworks, layout])

  return (
    <>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.2} scale={WALL_WIDTH} blur={4} far={FLOOR_DEPTH} />

      <GalleryWall width={WALL_WIDTH} height={WALL_HEIGHT} theme={theme} />
      <GalleryFloor width={WALL_WIDTH} depth={FLOOR_DEPTH} />
      <GalleryCeiling width={WALL_WIDTH} depth={FLOOR_DEPTH} wallHeight={WALL_HEIGHT} />

      {/* Framed artworks + spotlights */}
      {slottedArtworks.map(({ artwork, slot }) => {
        const is3D = artwork.mediaType === 'MODEL_3D'
        const spotY = WALL_HEIGHT - 0.15
        const spotZ = is3D ? slot.z + 0.15 : 0.5

        return (
          <group key={artwork.id}>
            {/* Wide soft spotlight — gallery pool, not harsh circle */}
            <spotLight
              position={[slot.x, spotY, spotZ]}
              angle={0.55}
              penumbra={0.95}
              intensity={is3D ? 4 : 5.5}
              distance={6}
              color="#fffaf0"
              castShadow
              shadow-mapSize-width={256}
              shadow-mapSize-height={256}
            />

            {is3D ? (
              <PedestalSculpture
                artwork={artwork}
                position={[slot.x, slot.y, slot.z]}
                hovered={hoveredId === artwork.id}
                onHover={(h) => onHover(h ? artwork.id : null)}
                onClick={() => onClick(artwork.id)}
              />
            ) : (
              <FramedArtwork
                artwork={artwork}
                position={[slot.x, slot.y, slot.z]}
                width={slot.width ?? 0.9}
                height={slot.height ?? 1.1}
                texture={artwork.posterUrl ? (textureCache.get(artwork.posterUrl) ?? null) : null}
                hovered={hoveredId === artwork.id}
                onHover={(h) => onHover(h ? artwork.id : null)}
                onClick={() => onClick(artwork.id)}
              />
            )}
          </group>
        )
      })}

      {/* Bright ambient — white cube, no dark corners */}
      <ambientLight intensity={0.42} color="#faf8f4" />
      <hemisphereLight args={['#ffffff', '#e8e4dc', 0.35]} />
    </>
  )
}

// ─── Outer wrapper ───

interface Hall3DCanvasProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  onArtworkClick?: (id: string) => void
  theme?: string | null
}

export function Hall3DCanvas({ artworks, layout, onArtworkClick, theme }: Hall3DCanvasProps) {
  const reduced = useReducedMotion()
  const lenis = useLenis()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const posterUrls = useMemo(
    () => artworks.map((a) => a.posterUrl).filter(Boolean) as string[],
    [artworks],
  )
  const textureCache = useTextureCache(posterUrls)

  // Scroll → progress
  useEffect(() => {
    if (!lenis) return
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      const progress = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0
      setScrollProgress(progress)
    }
    lenis.on('scroll', onScroll)
    return () => { lenis.off('scroll', onScroll) }
  }, [lenis])

  // Mouse parallax tracking
  useEffect(() => {
    const el = containerRef.current
    if (!el || reduced) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1   // -1..1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1) // -1..1, inverted
      setMouseNorm({ x: THREE.MathUtils.clamp(nx, -1, 1), y: THREE.MathUtils.clamp(ny, -1, 1) })
    }
    const onLeave = () => setMouseNorm({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [reduced])

  const handleHover = useCallback((id: string | null) => setHoveredId(id), [])
  const handleClick = useCallback((id: string) => onArtworkClick?.(id), [onArtworkClick])

  if (reduced) return null

  return (
    <div ref={containerRef} style={{ position: 'relative', height: `${SCROLL_HEIGHT_VH}vh` }}>
      <div style={{
        position: 'sticky', top: 0, left: 0,
        width: '100%', height: '100vh',
        backgroundColor: 'var(--bg)', overflow: 'hidden',
      }}>
        <Canvas
          dpr={[1, 2]}
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.25,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <SceneContent
            artworks={artworks}
            layout={layout}
            textureCache={textureCache}
            hoveredId={hoveredId}
            onHover={handleHover}
            onClick={handleClick}
            scrollProgress={scrollProgress}
            mouseNorm={mouseNorm}
            enableParallax={true}
            theme={theme}
          />
        </Canvas>
      </div>
    </div>
  )
}
