import { useRef, useMemo, useEffect, memo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Hall3DArtwork } from './Hall3DScene'
import { FRAME_PRESETS } from './customization'

interface FramedArtworkProps {
  artwork: Hall3DArtwork
  position: [number, number, number]
  width: number
  height: number
  texture: THREE.Texture | null
  hovered: boolean
  onHover: (hovered: boolean) => void
  onClick: () => void
  frameStyle?: string
}

const FRAME_DEPTH = 0.025
const MAT_BORDER = 0.06
const WALL_OFFSET = 0.015

/**
 * Compute artwork-plane dimensions that fit within [maxW, maxH]
 * while preserving the texture's native aspect ratio.
 * Falls back to maxW × maxH when the texture hasn't loaded yet.
 */
function fitAspect(
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | undefined,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  if (!image || !image.width || !image.height) return { w: maxW, h: maxH }
  const imgAspect = image.width / image.height
  const frameAspect = maxW / maxH
  if (imgAspect > frameAspect) {
    return { w: maxW, h: maxW / imgAspect }
  }
  return { w: maxH * imgAspect, h: maxH }
}

/** A framed 2D artwork on the gallery wall — poster texture, mat, and wooden frame. */
export const FramedArtwork = memo(function FramedArtwork({
  artwork,
  position,
  width,
  height,
  texture,
  hovered,
  onHover,
  onClick,
  frameStyle = 'classic',
}: FramedArtworkProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Fit artwork inside the allocated space while preserving native aspect ratio
  const { w: artW, h: artH } = useMemo(
    () => fitAspect(texture?.image as HTMLImageElement | undefined, width, height),
    [texture, width, height],
  )

  // Frame dimensions: artwork + mat border on each side + frame thickness
  const frameOuterW = width + MAT_BORDER * 2
  const frameOuterH = height + MAT_BORDER * 2

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Mat / passe-partout — extends to the frame, artwork sits inside */}
      <mesh position={[0, 0, WALL_OFFSET]} castShadow>
        <planeGeometry args={[frameOuterW, frameOuterH]} />
        <meshStandardMaterial color="#f5f0eb" roughness={0.6} />
      </mesh>

      {/* Artwork poster plane — sized to native aspect ratio, centered in frame */}
      <mesh position={[0, 0, WALL_OFFSET + 0.001]} castShadow>
        <planeGeometry args={[artW, artH]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55}
          metalness={0.05}
          toneMapped
        />
      </mesh>

      {/* Frame — style-driven */}
      <FrameBox
        frameOuterW={frameOuterW}
        frameOuterH={frameOuterH}
        zOffset={WALL_OFFSET + FRAME_DEPTH / 2}
        hovered={hovered}
        frameStyle={frameStyle}
      />

      {/* Two offset point lights — wide soft wash, no center hotspot */}
      {hovered && (
        <>
          <pointLight position={[-frameOuterW * 0.28, frameOuterH * 0.28, 0.7]} intensity={0.5} distance={4} color="#fffaf0" />
          <pointLight position={[frameOuterW * 0.28, -frameOuterH * 0.28, 0.7]} intensity={0.5} distance={4} color="#fffaf0" />
        </>
      )}

      {/* Hover label — museum-style plaque above the frame */}
      {hovered && (
        <Html
          center
          position={[0, frameOuterH / 2 + 0.12, WALL_OFFSET + 0.01]}
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="font-display"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '4px 12px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {artwork.displayTitle ?? artwork.title}
          </span>
        </Html>
      )}
    </group>
  )
})

/** Single merged frame geometry — outer rectangle with inner hole, extruded.
 *  Replaces 4 separate box meshes with 1 draw call per artwork frame. */
function FrameBox({
  frameOuterW,
  frameOuterH,
  zOffset,
  hovered,
  frameStyle,
}: {
  frameOuterW: number
  frameOuterH: number
  zOffset: number
  hovered: boolean
  frameStyle: string
}) {
  const preset = FRAME_PRESETS[frameStyle] ?? FRAME_PRESETS.classic
  const thickness = preset.thickness
  const hw = frameOuterW / 2
  const hh = frameOuterH / 2

  const geometry = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-hw - thickness, -hh - thickness)
    outer.lineTo( hw + thickness, -hh - thickness)
    outer.lineTo( hw + thickness,  hh + thickness)
    outer.lineTo(-hw - thickness,  hh + thickness)
    outer.closePath()

    const hole = new THREE.Path()
    hole.moveTo(-hw, -hh)
    hole.lineTo( hw, -hh)
    hole.lineTo( hw,  hh)
    hole.lineTo(-hw,  hh)
    hole.closePath()
    outer.holes.push(hole)

    return new THREE.ExtrudeGeometry(outer, { depth: FRAME_DEPTH, bevelEnabled: false })
  }, [hw, hh, thickness])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  const rosThickness = thickness * 0.7
  const rosGeometry = useMemo(() => new THREE.SphereGeometry(rosThickness, 8, 4), [rosThickness])

  // Floating frame: just the mat, no visible frame
  if (frameStyle === 'floating') return null

  const stripColor = hovered ? preset.hoverColor : preset.color
  const stripEmissive = hovered ? '#1a1a18' : '#000000'

  return (
    <group>
      <mesh
        position={[0, 0, zOffset - FRAME_DEPTH / 2]}
        geometry={geometry}
        castShadow
      >
        <meshStandardMaterial
          color={stripColor}
          roughness={preset.roughness}
          metalness={preset.metalness}
          emissive={stripEmissive}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Ornate: corner rosettes */}
      {frameStyle === 'ornate' && (
        <>
          {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
            <mesh key={i} position={[sx * (hw + thickness / 2), sy * (hh + thickness / 2), zOffset + 0.005]} geometry={rosGeometry} castShadow>
              <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
