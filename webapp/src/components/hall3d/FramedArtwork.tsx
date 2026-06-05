import { useRef, memo } from 'react'
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
      {/* Mat / passe-partout — dark rectangle behind the artwork */}
      <mesh position={[0, 0, WALL_OFFSET]} castShadow>
        <planeGeometry args={[frameOuterW, frameOuterH]} />
        <meshStandardMaterial color="#f5f0eb" roughness={0.6} />
      </mesh>

      {/* Artwork poster plane */}
      <mesh position={[0, 0, WALL_OFFSET + 0.001]} castShadow>
        <planeGeometry args={[width, height]} />
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

/** Four frame strips forming a rectangular border, styled by frameStyle preset. */
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
  const halfW = frameOuterW / 2
  const halfH = frameOuterH / 2
  const halfT = thickness / 2
  const stripColor = hovered ? preset.hoverColor : preset.color

  // Floating frame: just the mat, no visible frame
  if (frameStyle === 'floating') return null

  const stripEmissive = hovered ? '#1a1a18' : '#000000'

  return (
    <group>
      {/* Top */}
      <mesh position={[0, halfH + halfT, zOffset]} castShadow>
        <boxGeometry args={[frameOuterW + thickness * 2, thickness, FRAME_DEPTH]} />
        <meshStandardMaterial color={stripColor} roughness={preset.roughness} metalness={preset.metalness} emissive={stripEmissive} emissiveIntensity={0.15} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -halfH - halfT, zOffset]} castShadow>
        <boxGeometry args={[frameOuterW + thickness * 2, thickness, FRAME_DEPTH]} />
        <meshStandardMaterial color={stripColor} roughness={preset.roughness} metalness={preset.metalness} emissive={stripEmissive} emissiveIntensity={0.15} />
      </mesh>
      {/* Left */}
      <mesh position={[-halfW - halfT, 0, zOffset]} castShadow>
        <boxGeometry args={[thickness, frameOuterH, FRAME_DEPTH]} />
        <meshStandardMaterial color={stripColor} roughness={preset.roughness} metalness={preset.metalness} emissive={stripEmissive} emissiveIntensity={0.15} />
      </mesh>
      {/* Right */}
      <mesh position={[halfW + halfT, 0, zOffset]} castShadow>
        <boxGeometry args={[thickness, frameOuterH, FRAME_DEPTH]} />
        <meshStandardMaterial color={stripColor} roughness={preset.roughness} metalness={preset.metalness} emissive={stripEmissive} emissiveIntensity={0.15} />
      </mesh>

      {/* Ornate: corner rosettes */}
      {frameStyle === 'ornate' && (
        <>
          {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
            <mesh key={i} position={[sx * (halfW + halfT), sy * (halfH + halfT), zOffset + 0.005]} castShadow>
              <sphereGeometry args={[thickness * 0.7, 8, 4]} />
              <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
