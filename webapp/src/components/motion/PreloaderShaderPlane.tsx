import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Types ───

export type PreloaderPhase = 'enter' | 'logo' | 'text' | 'hold' | 'exit' | 'done'

// ─── Phase → pulse target ───

function pulseTarget(phase: PreloaderPhase): number {
  switch (phase) {
    case 'enter':  return 0.0
    case 'logo':   return 1.0
    case 'text':   return 0.25
    case 'hold':   return 0.0
    case 'exit':   return 0.0
    default:       return 0.0
  }
}

// ─── Inner scene — fullscreen dark quad + 3D ring ───

function Scene({ phase }: { phase: PreloaderPhase }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const smoothPulse = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Smooth pulse lerp
    const target = pulseTarget(phase)
    smoothPulse.current = THREE.MathUtils.lerp(smoothPulse.current, target, 0.08)

    // 3D EnergyRing — subtle rotation + pulse scale
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.3
      ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.1
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.08 + Math.sin(t * 2) * 0.04 + smoothPulse.current * 0.18
      ringRef.current.scale.setScalar(1.0 + smoothPulse.current * 0.3)
    }
  })

  return (
    <>
      {/* Fullscreen dark overlay quad */}
      <mesh>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial
          color="#0A0A0A"
          transparent
          opacity={0.92}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* 3D EnergyRing */}
      <mesh ref={ringRef} position={[0, 0, 0.05]}>
        <ringGeometry args={[0.6, 0.72, 80]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

// ─── Public component ───

export function PreloaderShaderPlane({ phase }: { phase: PreloaderPhase }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 45, near: 0.1, far: 10 }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'transparent',
      }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
      }}
      dpr={[1, 1.5]}
    >
      <Scene phase={phase} />
    </Canvas>
  )
}
