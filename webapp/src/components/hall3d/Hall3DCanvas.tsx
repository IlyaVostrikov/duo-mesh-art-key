import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useTextureCache } from '@/hooks/useTextureCache'
import { useKeyboardCamera } from '@/hooks/useKeyboardCamera'
import { useEnvironmentMap } from '@/hooks/useEnvironmentMap'
import { GalleryWall } from './GalleryWall'
import { GalleryFloor } from './GalleryFloor'
import { GalleryCeiling } from './GalleryCeiling'
import { FramedArtwork } from './FramedArtwork'
import { PedestalSculpture } from './PedestalSculpture'
import { WALL_HEIGHT, FLOOR_DEPTH, EYE, RoomWalls } from './RoomGroup'
import { computeWallWidth } from './layoutTemplates'
import { ArtworkLighting, PedestalSpot } from './Lighting'
import { AccentLighting } from './AccentLighting'
import type { SlotLayout } from './layoutTemplates'
import type { Hall3DArtwork } from './Hall3DScene'
import type { HallCustomization } from './customization'
import { LIGHTING_PRESETS, ROOM_SHAPE_SCALES, DEFAULT_CUSTOMIZATION } from './customization'
import {
  FOV, CAMERA_Z_FAR, CAMERA_Z_NEAR, LERP_SPEED, MOUSE_YAW_DEG, MOUSE_PITCH_DEG,
  toRad,
} from './constants'
import * as THREE from 'three'

// ─── Scene content ───

interface SceneContentProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  textureCache: Map<string, THREE.Texture | null>
  hoveredId: string | null
  onHover: (id: string | null) => void
  onClick: (id: string) => void
  dollyRef: React.MutableRefObject<number>
  panRef: React.MutableRefObject<number>
  mouseNorm: { x: number; y: number }
  enableParallax: boolean
  wallWidth: number
  customization?: HallCustomization | null
}

function SceneContent({
  artworks, layout, textureCache, hoveredId, onHover, onClick,
  dollyRef, panRef, mouseNorm, enableParallax, wallWidth, customization,
}: SceneContentProps) {
  const c = { ...DEFAULT_CUSTOMIZATION, ...(customization ?? {}) } as Required<Omit<HallCustomization, 'wallColor'>> & { wallColor?: string }
  const lighting = LIGHTING_PRESETS[c.lightingPreset] ?? LIGHTING_PRESETS.warm
  const shape = ROOM_SHAPE_SCALES[c.roomShape] ?? ROOM_SHAPE_SCALES.rectangle
  const scaledWidth = wallWidth * shape.widthScale
  const scaledDepth = FLOOR_DEPTH * shape.depthScale
  const camRef = useRef<THREE.PerspectiveCamera>(null!)
  const currentYaw = useRef(0)
  const currentPitch = useRef(0)
  const currentZ = useRef(CAMERA_Z_FAR)

  const { camera } = useThree()
  useEnvironmentMap()

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

    const targetZ = THREE.MathUtils.lerp(CAMERA_Z_FAR, CAMERA_Z_NEAR, dollyRef.current)
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, LERP_SPEED * dt))
    const z = currentZ.current

    const targetYaw = enableParallax ? mouseNorm.x * toRad(MOUSE_YAW_DEG) : 0
    const targetPitch = enableParallax ? mouseNorm.y * toRad(MOUSE_PITCH_DEG) : 0
    currentYaw.current = THREE.MathUtils.lerp(currentYaw.current, targetYaw, Math.min(1, 3 * dt))
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch, Math.min(1, 3 * dt))


    const yaw = currentYaw.current
    const pitch = currentPitch.current
    const panProgress = panRef.current
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
      {/* Ambient + hemisphere base — from lighting preset */}
      <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
      <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />

      {/* Gallery wall — art + enclosure */}
      <GalleryWall
        width={scaledWidth} height={WALL_HEIGHT}
        theme={c.wallTheme} customColor={c.wallTheme === 'custom' ? c.wallColor ?? null : null}
      />
      <GalleryFloor width={scaledWidth} depth={scaledDepth} floorType={c.floorType} />
      <GalleryCeiling width={scaledWidth} depth={scaledDepth} wallHeight={WALL_HEIGHT} ceilingStyle={c.ceilingStyle} />
      <RoomWalls halfW={scaledWidth / 2} />

      {/* Accent lights */}
      <AccentLighting width={scaledWidth} depth={scaledDepth} wallHeight={WALL_HEIGHT} accentLight={c.accentLight} />

      {/* ─── Artwork lighting: top + bottom spots per work ─── */}
      {slottedArtworks.map(({ artwork, slot }) => {
        const is3D = artwork.mediaType === 'MODEL_3D'
        return (
          <group key={artwork.id}>
            {is3D ? (
              <PedestalSpot x={slot.x} z={slot.z} />
            ) : (
              <ArtworkLighting slotX={slot.x} slotZ={slot.z} />
            )}

            {is3D ? (
              <PedestalSculpture
                artwork={artwork}
                position={[slot.x, slot.y, slot.z]}
                hovered={hoveredId === artwork.id}
                onHover={(h) => onHover(h ? artwork.id : null)}
                onClick={() => onClick(artwork.id)}
                pedestalStyle={c.pedestalStyle}
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
                frameStyle={c.frameStyle}
              />
            )}
          </group>
        )
      })}

    </>
  )
}

// ─── Outer wrapper ───

interface Hall3DCanvasProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  onArtworkClick?: (id: string) => void
  customization?: HallCustomization | null
}

export function Hall3DCanvas({ artworks, layout, onArtworkClick, customization }: Hall3DCanvasProps) {
  const reduced = useReducedMotion()
  const { dollyRef, panRef } = useKeyboardCamera(!reduced)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const wallWidth = useMemo(() => computeWallWidth(layout.slots), [layout])

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

  const handleCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      console.warn('[Hall3DCanvas] WebGL context lost — preserving for restore')
    }
    const onRestored = () => {
      console.log('[Hall3DCanvas] WebGL context restored')
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    // Store for cleanup — returned cleanup isn't called by R3F on created,
    // so we attach to canvas and clean up ourselves
    ;(canvas as any).__ctxHandlers = { onLost, onRestored }
  }, [])

  // Common canvas props — static frame when reduced motion
  const canvasContent = (
    <Canvas
      dpr={[1, 2]}
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.6,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={handleCreated}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent
        artworks={artworks}
        layout={layout}
        textureCache={textureCache}
        hoveredId={reduced ? null : hoveredId}
        onHover={reduced ? () => {} : handleHover}
        onClick={reduced ? () => {} : handleClick}
        dollyRef={dollyRef}
        panRef={panRef}
        mouseNorm={reduced ? { x: 0, y: 0 } : mouseNorm}
        enableParallax={!reduced}
        wallWidth={wallWidth}
        customization={customization}
      />
    </Canvas>
  )

  return (
    <div ref={containerRef} className="w-full h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {canvasContent}
    </div>
  )
}
