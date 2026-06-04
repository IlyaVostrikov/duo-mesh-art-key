import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { GalleryWall } from './GalleryWall'
import { GalleryFloor } from './GalleryFloor'
import { GalleryCeiling } from './GalleryCeiling'
import { FramedArtwork } from './FramedArtwork'
import { PedestalSculpture } from './PedestalSculpture'
import type { SlotLayout } from './layoutTemplates'
import type { Hall3DArtwork } from './Hall3DScene'
import * as THREE from 'three'

const WALL_HEIGHT = 4.2
const FLOOR_DEPTH = 8
const EYE = 1.55
const FOV = 42
const CAMERA_Z_FAR = 5.5
const CAMERA_Z_NEAR = 1.2
const LERP_SPEED = 4.5
const DOLLY_SPEED = 0.25   // 0→1 in ~4s holding the key
const PAN_SPEED = 0.35     // -1→1 in ~6s holding the key
const MOUSE_YAW_DEG = 14 // ±14° — keeps wall edges out of frame
const MOUSE_PITCH_DEG = 5

function toRad(deg: number) { return THREE.MathUtils.degToRad(deg) }

function computeWallWidth(layout: SlotLayout): number {
  if (layout.slots.length === 0) return 10
  const xs = layout.slots.map((s) => s.x)
  const span = Math.max(...xs) - Math.min(...xs)
  // artwork width + frame ~1.2m per side, plus 2m margin each side
  return Math.max(14, Math.ceil(span + 1.3 + 4))
}

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

// ─── Room enclosure: side walls + back wall ───

interface RoomWallsProps {
  wallWidth: number
  wallHeight: number
  floorDepth: number
}

/** Plain matte enclosure — closes the room so camera never sees void. */
function RoomWalls({ wallWidth, wallHeight, floorDepth }: RoomWallsProps) {
  const halfW = wallWidth / 2
  const halfH = wallHeight / 2
  const halfD = floorDepth / 2

  return (
    <group>
      {/* Left side wall */}
      <mesh position={[-halfW, halfH, halfD]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[floorDepth, wallHeight]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Right side wall */}
      <mesh position={[halfW, halfH, halfD]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[floorDepth, wallHeight]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, halfH, floorDepth]} receiveShadow>
        <planeGeometry args={[wallWidth, wallHeight]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} />
      </mesh>
    </group>
  )
}

/** Arrow-key camera control: ↑↓ dolly, ←→ pan. Smooth, holds position on release. */
function useKeyboardCamera(enabled: boolean) {
  const [dolly, setDolly] = useState(0) // 0=far, 1=near
  const [pan, setPan] = useState(0)     // -1=left, +1=right
  const dirRef = useRef({ v: 0, h: 0 }) // v: +1=отдалить, -1=приблизить; h: -1=влево, +1=вправо

  useEffect(() => {
    if (!enabled) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp')    { e.preventDefault(); dirRef.current.v = 1 }   // отдалить
      if (e.key === 'ArrowDown')  { e.preventDefault(); dirRef.current.v = -1 }  // приблизить
      if (e.key === 'ArrowLeft')  { e.preventDefault(); dirRef.current.h = -1 }  // влево
      if (e.key === 'ArrowRight') { e.preventDefault(); dirRef.current.h = 1 }   // вправо
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown')    { dirRef.current.v = 0 }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { dirRef.current.h = 0 }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let frame: number
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const { v, h } = dirRef.current
      if (v !== 0) setDolly((prev) => THREE.MathUtils.clamp(prev + v * DOLLY_SPEED * dt, 0, 1))
      if (h !== 0) setPan((prev) => THREE.MathUtils.clamp(prev + h * PAN_SPEED * dt, -1, 1))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled])

  return { dolly, pan }
}

/** Paired top + bottom spots for a single wall artwork — both aimed at the artwork center. */
function ArtworkLighting({ slotX, slotZ, wallHeight }: { slotX: number; slotZ: number; wallHeight: number }) {
  const target = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(slotX, EYE, slotZ)
    return t
  }, [slotX, slotZ])

  return (
    <>
      {/* Top spot — pulled back + wide penumbra to kill visible cone on ceiling */}
      <spotLight
        position={[slotX, wallHeight - 0.25, slotZ + 1.5]}
        target={target}
        angle={0.5}
        penumbra={0.85}
        intensity={5}
        distance={8}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
      />
      {/* Bottom spot — set further back to dissolve floor hot-spot */}
      <spotLight
        position={[slotX, 0.3, slotZ + 2.8]}
        target={target}
        angle={0.65}
        penumbra={1.0}
        intensity={2}
        distance={6}
        color="#fef9f0"
      />
    </>
  )
}

/** Warm accent point lights — spaced wide, set back from wall to avoid visible circles. */
function FloorLamps({ wallWidth }: { wallWidth: number }) {
  const lamps = useMemo(() => {
    const spacing = 3.5
    const count = Math.floor(wallWidth / spacing) + 1
    const startX = -(count - 1) * spacing / 2
    return Array.from({ length: count }, (_, i) => startX + i * spacing)
  }, [wallWidth])

  return (
    <group>
      {lamps.map((x) => (
        <pointLight
          key={x}
          position={[x, 0.22, 1.8]}
          intensity={0.5}
          distance={5}
          decay={2}
          color="#ffeedd"
        />
      ))}
    </group>
  )
}

/** Spotlight aimed at a specific pedestal position — uses a positioned target Object3D. */
function PedestalSpot({ x, z, wallHeight }: { x: number; z: number; wallHeight: number }) {
  const [target] = useState(() => new THREE.Object3D())
  target.position.set(x, 0.55, z)

  return (
    <spotLight
      position={[x, wallHeight - 0.3, z + 0.6]}
      target={target}
      angle={0.45}
      penumbra={0.8}
      intensity={9}
      distance={5.5}
      color="#fffaf0"
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
    />
  )
}

// ─── Scene content ───

interface SceneContentProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  textureCache: Map<string, THREE.Texture | null>
  hoveredId: string | null
  onHover: (id: string | null) => void
  onClick: (id: string) => void
  dollyProgress: number
  panProgress: number
  mouseNorm: { x: number; y: number }
  enableParallax: boolean
  wallWidth: number
  theme?: string | null
}

function SceneContent({
  artworks, layout, textureCache, hoveredId, onHover, onClick,
  dollyProgress, panProgress, mouseNorm, enableParallax, wallWidth, theme,
}: SceneContentProps) {
  const camRef = useRef<THREE.PerspectiveCamera>(null!)
  const currentYaw = useRef(0)
  const currentPitch = useRef(0)
  const currentZ = useRef(CAMERA_Z_FAR)

  const { camera } = useThree()
  useEffect(() => {
    const pcam = camera as THREE.PerspectiveCamera
    pcam.position.set(0, EYE, CAMERA_Z_FAR)
    pcam.fov = FOV
    pcam.near = 0.1
    pcam.far = 50
    pcam.lookAt(0, EYE, 0)
    pcam.updateProjectionMatrix()
    camRef.current = pcam
    currentZ.current = CAMERA_Z_FAR
  }, [camera])

  useFrame((_, dt) => {
    if (!camRef.current) return
    const pcam = camRef.current

    const targetZ = THREE.MathUtils.lerp(CAMERA_Z_FAR, CAMERA_Z_NEAR, dollyProgress)
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, LERP_SPEED * dt))
    const z = currentZ.current

    const targetYaw = enableParallax ? mouseNorm.x * toRad(MOUSE_YAW_DEG) : 0
    const targetPitch = enableParallax ? mouseNorm.y * toRad(MOUSE_PITCH_DEG) : 0
    currentYaw.current = THREE.MathUtils.lerp(currentYaw.current, targetYaw, Math.min(1, 3 * dt))
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch, Math.min(1, 3 * dt))

    const yaw = currentYaw.current
    const pitch = currentPitch.current
    const panOffset = panProgress * z * 1.2 // scales with distance: far=wide, near=subtle
    const lookX = z * Math.tan(yaw) + panOffset
    const lookY = EYE + z * Math.tan(pitch)

    pcam.position.set(
      z * Math.tan(yaw) * 0.08,
      EYE + z * Math.tan(pitch) * 0.08,
      z,
    )
    pcam.lookAt(lookX, lookY, 0)
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
      {/* Ambient + hemisphere base */}
      <ambientLight intensity={0.35} color="#faf8f4" />
      <hemisphereLight args={['#ffffff', '#e8e4dc', 0.28]} />

      {/* Gallery wall — art + enclosure */}
      <GalleryWall width={wallWidth} height={WALL_HEIGHT} theme={theme} />
      <GalleryFloor width={wallWidth} depth={FLOOR_DEPTH} />
      <GalleryCeiling width={wallWidth} depth={FLOOR_DEPTH} wallHeight={WALL_HEIGHT} />
      <RoomWalls wallWidth={wallWidth} wallHeight={WALL_HEIGHT} floorDepth={FLOOR_DEPTH} />

      {/* ─── Artwork lighting: top + bottom spots per work ─── */}
      {slottedArtworks.map(({ artwork, slot }) => {
        const is3D = artwork.mediaType === 'MODEL_3D'
        return (
          <group key={artwork.id}>
            {is3D ? (
              <PedestalSpot x={slot.x} z={slot.z} wallHeight={WALL_HEIGHT} />
            ) : (
              <ArtworkLighting slotX={slot.x} slotZ={slot.z} wallHeight={WALL_HEIGHT} />
            )}

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

      {/* ─── Floor accent lamps — warm pools of light along the wall base ─── */}
      <FloorLamps wallWidth={wallWidth} />
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
  const { dolly: dollyProgress, pan: panProgress } = useKeyboardCamera(!reduced)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const wallWidth = useMemo(() => computeWallWidth(layout), [layout])

  const posterUrls = useMemo(
    () => artworks.map((a) => a.posterUrl).filter(Boolean) as string[],
    [artworks],
  )
  const textureCache = useTextureCache(posterUrls)

  // Mouse parallax tracking
  useEffect(() => {
    const el = containerRef.current
    if (!el || reduced) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
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

  // Common canvas props — static frame when reduced motion
  const canvasContent = (
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
        hoveredId={reduced ? null : hoveredId}
        onHover={reduced ? () => {} : handleHover}
        onClick={reduced ? () => {} : handleClick}
        dollyProgress={reduced ? 0 : dollyProgress}
        panProgress={reduced ? 0 : panProgress}
        mouseNorm={reduced ? { x: 0, y: 0 } : mouseNorm}
        enableParallax={!reduced}
        wallWidth={wallWidth}
        theme={theme}
      />
    </Canvas>
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
      {canvasContent}
    </div>
  )
}
