import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface GlassDoorProps {
  position: [number, number, number]
  rotationY: number
  direction: 'prev' | 'next'
  label: string
  hovered: boolean
  onHover: (h: boolean) => void
  onClick: () => void
}

const DOOR_W = 1.6
const DOOR_H = 3.0
const FRAME_T = 0.08
const FRAME_D = 0.1
const GLASS_W = DOOR_W - FRAME_T * 2
const GLASS_H = DOOR_H - FRAME_T * 2

/** Frosted glass door — dark portal opening + thick metal frame + frosted glass panel. */
export function GlassDoor({ position, rotationY, direction, label, hovered, onHover, onClick }: GlassDoorProps) {
  const signX = direction === 'next' ? 0.6 : -0.6
  const handleY = DOOR_H * 0.35 - DOOR_H / 2

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Dark portal opening — visible silhouette against light wall */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[DOOR_W + 0.06, DOOR_H + 0.06]} />
        <meshStandardMaterial color="#3a3832" roughness={0.85} metalness={0} />
      </mesh>

      {/* Frame — four thick metal strips */}
      <FrameBox hovered={hovered} />

      {/* Glass pane — frosted, offset in front of dark portal */}
      <mesh position={[0, 0, FRAME_D + 0.01]}>
        <planeGeometry args={[GLASS_W, GLASS_H]} />
        <meshStandardMaterial
          color="#c8c4bc"
          roughness={0.6}
          metalness={0.05}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Handle bar */}
      <mesh position={[signX, handleY, FRAME_D + 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.4, 8]} />
        <meshStandardMaterial color="#4a4a44" roughness={0.3} metalness={0.65} />
      </mesh>

      {/* Hover glow */}
      {hovered && (
        <pointLight position={[0, 0, 0.7]} intensity={0.7} distance={2.5} color="#fffaf0" />
      )}

      {/* Hover label */}
      {hovered && (
        <Html center position={[0, DOOR_H / 2 + 0.4, 0]} style={{ pointerEvents: 'none' }}>
          <span
            className="font-display"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text)',
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: '3px 10px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {label}
          </span>
        </Html>
      )}
    </group>
  )
}

function FrameBox({ hovered }: { hovered: boolean }) {
  const halfW = DOOR_W / 2
  const halfH = DOOR_H / 2
  const halfT = FRAME_T / 2
  const stripColor = hovered ? '#c4a060' : '#5a5548'
  const stripEmissive = hovered ? '#3a3020' : '#000000'

  return (
    <group>
      {/* Top */}
      <mesh position={[0, halfH + halfT, FRAME_D / 2]}>
        <boxGeometry args={[DOOR_W + FRAME_T * 2, FRAME_T, FRAME_D]} />
        <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.5} emissive={stripEmissive} emissiveIntensity={0.1} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -halfH - halfT, FRAME_D / 2]}>
        <boxGeometry args={[DOOR_W + FRAME_T * 2, FRAME_T, FRAME_D]} />
        <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.5} emissive={stripEmissive} emissiveIntensity={0.1} />
      </mesh>
      {/* Left */}
      <mesh position={[-halfW - halfT, 0, FRAME_D / 2]}>
        <boxGeometry args={[FRAME_T, DOOR_H, FRAME_D]} />
        <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.5} emissive={stripEmissive} emissiveIntensity={0.1} />
      </mesh>
      {/* Right */}
      <mesh position={[halfW + halfT, 0, FRAME_D / 2]}>
        <boxGeometry args={[FRAME_T, DOOR_H, FRAME_D]} />
        <meshStandardMaterial color={stripColor} roughness={0.3} metalness={0.5} emissive={stripEmissive} emissiveIntensity={0.1} />
      </mesh>
    </group>
  )
}
