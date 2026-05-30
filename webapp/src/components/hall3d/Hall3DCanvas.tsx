import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { useLenis } from '@/components/motion/LenisProvider'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { GalleryWall } from './GalleryWall'
import { GalleryFloor } from './GalleryFloor'
import { FramedArtwork } from './FramedArtwork'
import { PedestalSculpture } from './PedestalSculpture'
import type { SlotLayout } from './layoutTemplates'
import type { Hall3DArtwork } from './Hall3DScene'
import * as THREE from 'three'

const WALL_WIDTH = 8
const WALL_HEIGHT = 3.5
const FLOOR_DEPTH = 5
const CAMERA_TRAVEL = 6
const SCROLL_HEIGHT_VH = 200

// ─── Texture preloader (outside Canvas — no R3F hooks) ───

function useTextureCache(urls: (string | null)[]) {
  const [cache, setCache] = useState<Map<string, THREE.Texture | null>>(new Map())

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const next = new Map(cache)
    let cancelled = false

    for (const url of urls) {
      if (!url || next.has(url)) continue
      next.set(url, null) // placeholder — avoid double-load
      loader.load(
        url,
        (tex) => {
          if (!cancelled) {
            tex.colorSpace = THREE.SRGBColorSpace
            setCache((prev) => {
              const n = new Map(prev)
              n.set(url, tex)
              return n
            })
          }
        },
        undefined,
        () => {
          if (!cancelled) {
            setCache((prev) => {
              const n = new Map(prev)
              n.set(url, null) // mark as failed
              return n
            })
          }
        },
      )
    }

    return () => {
      cancelled = true
    }
  }, [urls.filter(Boolean).join(',')])

  return cache
}

// ─── Scene content (inside Canvas) ───

interface SceneContentProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  textureCache: Map<string, THREE.Texture | null>
  hoveredId: string | null
  onHover: (id: string | null) => void
  onClick: (id: string) => void
  scrollProgress: number
}

function SceneContent({
  artworks,
  layout,
  textureCache,
  hoveredId,
  onHover,
  onClick,
  scrollProgress,
}: SceneContentProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!)

  const slottedArtworks = useMemo(() => {
    const result: Array<{ artwork: Hall3DArtwork; slot: SlotLayout['slots'][number] }> = []
    artworks.forEach((aw, i) => {
      if (i < layout.slots.length) {
        result.push({ artwork: aw, slot: layout.slots[i] })
      }
    })
    return result
  }, [artworks, layout])

  useFrame(() => {
    if (!cameraRef.current) return
    const t = scrollProgress
    const camX = THREE.MathUtils.lerp(CAMERA_TRAVEL / 2, -CAMERA_TRAVEL / 2, t)
    cameraRef.current.position.x = camX
    cameraRef.current.lookAt(camX, WALL_HEIGHT / 2, 0)
  })

  const { camera } = useThree()
  useEffect(() => {
    const pcam = camera as THREE.PerspectiveCamera
    pcam.position.set(CAMERA_TRAVEL / 2, 1.6, 4.5)
    pcam.fov = 45
    pcam.near = 0.1
    pcam.far = 30
    pcam.lookAt(0, WALL_HEIGHT / 2, 0)
    pcam.updateProjectionMatrix()
    cameraRef.current = pcam
  }, [camera])

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={WALL_WIDTH} blur={2} far={FLOOR_DEPTH} />

      <GalleryWall width={WALL_WIDTH} height={WALL_HEIGHT} />
      <GalleryFloor width={WALL_WIDTH} depth={FLOOR_DEPTH} />

      {slottedArtworks.map(({ artwork, slot }) =>
        artwork.mediaType === 'MODEL_3D' ? (
          <PedestalSculpture
            key={artwork.id}
            artwork={artwork}
            position={[slot.x, slot.y, slot.z]}
            hovered={hoveredId === artwork.id}
            onHover={(h) => onHover(h ? artwork.id : null)}
            onClick={() => onClick(artwork.id)}
          />
        ) : (
          <FramedArtwork
            key={artwork.id}
            artwork={artwork}
            position={[slot.x, slot.y, slot.z]}
            width={slot.width ?? 0.7}
            height={slot.height ?? 0.5}
            texture={artwork.posterUrl ? (textureCache.get(artwork.posterUrl) ?? null) : null}
            hovered={hoveredId === artwork.id}
            onHover={(h) => onHover(h ? artwork.id : null)}
            onClick={() => onClick(artwork.id)}
          />
        ),
      )}

      <ambientLight intensity={0.3} color="#222233" />
      <directionalLight
        position={[5, 5, 5]} intensity={0.5}
        castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-WALL_WIDTH / 2} shadow-camera-right={WALL_WIDTH / 2}
        shadow-camera-top={WALL_HEIGHT} shadow-camera-bottom={-0.5}
      />
    </>
  )
}

// ─── Outer wrapper ───

interface Hall3DCanvasProps {
  artworks: Hall3DArtwork[]
  layout: SlotLayout
  onArtworkClick?: (id: string) => void
}

export function Hall3DCanvas({ artworks, layout, onArtworkClick }: Hall3DCanvasProps) {
  const reduced = useReducedMotion()
  const lenis = useLenis()
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Preload all poster textures outside Canvas
  const posterUrls = useMemo(
    () => artworks.map((a) => a.posterUrl).filter(Boolean) as string[],
    [artworks],
  )
  const textureCache = useTextureCache(posterUrls)

  useEffect(() => {
    if (!lenis) return
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      const progress = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0
      setScrollProgress(progress)
    }
    lenis.on('scroll', onScroll)
    return () => { lenis.off('scroll', onScroll) }
  }, [lenis])

  const handleHover = useCallback((id: string | null) => setHoveredId(id), [])
  const handleClick = useCallback((id: string) => onArtworkClick?.(id), [onArtworkClick])

  if (reduced) return null

  return (
    <div style={{ position: 'relative', height: `${SCROLL_HEIGHT_VH}vh` }}>
      <div style={{
        position: 'sticky', top: 0, left: 0,
        width: '100%', height: '100vh',
        backgroundColor: '#0a0a0a', overflow: 'hidden',
      }}>
        <Canvas
          dpr={[1, 2]}
          shadows="soft"
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
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
          />
        </Canvas>
      </div>
    </div>
  )
}
