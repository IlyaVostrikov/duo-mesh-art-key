import { useRef, useState, useEffect } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Hall3DArtwork } from './Hall3DScene'

interface PedestalSculptureProps {
  artwork: Hall3DArtwork
  position: [number, number, number]
  hovered: boolean
  onHover: (hovered: boolean) => void
  onClick: () => void
}

const PEDESTAL_W = 0.45
const PEDESTAL_H = 0.12
const PEDESTAL_D = 0.45

/** A 3D sculpture on a minimalist pedestal, placed on the floor. */
export function PedestalSculpture({
  artwork,
  position,
  hovered,
  onHover,
  onClick,
}: PedestalSculptureProps) {
  const groupRef = useRef<THREE.Group>(null!)

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Pedestal — dark box */}
      <mesh
        position={[0, PEDESTAL_H / 2, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[PEDESTAL_W, PEDESTAL_H, PEDESTAL_D]} />
        <meshStandardMaterial
          color={hovered ? '#1a1a22' : '#12121a'}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* 3D model on top of pedestal — loaded imperatively, no suspend */}
      {artwork.modelUrl && (
        <SculptureModel
          modelUrl={artwork.modelUrl}
          pedestalTop={PEDESTAL_H}
        />
      )}

      {/* Hover label */}
      {hovered && (
        <pointLight
          position={[0, PEDESTAL_H + 0.6, 0.2]}
          intensity={1.5}
          distance={2}
          color="#c6ff3a"
        />
      )}
      {hovered && (
        <Html
          center
          position={[0, PEDESTAL_H + 1.0, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="font-display"
            style={{
              fontSize: '0.75rem',
              color: '#c6ff3a',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '4px 12px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            {artwork.displayTitle ?? artwork.title}
          </span>
        </Html>
      )}
    </group>
  )
}

// Simple shared cache — survives remounts within the same Canvas
const gltfCache = new Map<string, THREE.Group>()

/** Loads and auto-scales the GLB model imperatively — no useGLTF / useLoader (no suspend). */
function SculptureModel({
  modelUrl,
  pedestalTop,
}: {
  modelUrl: string
  pedestalTop: number
}) {
  const [cloned, setCloned] = useState<THREE.Group | null>(() => {
    const cached = gltfCache.get(modelUrl)
    return cached ? cached.clone() : null
  })

  useEffect(() => {
    if (cloned) return // already loaded (cache hit in useState init)
    const loader = new GLTFLoader()
    let cancelled = false
    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return
        gltfCache.set(modelUrl, gltf.scene)
        setCloned(gltf.scene.clone())
      },
      undefined,
      () => { /* silently ignore load errors — pedestal renders fine */ },
    )
    return () => { cancelled = true }
  }, [modelUrl, cloned])

  if (!cloned) return null

  // Center and scale the model to fit ~0.4m tall
  const box = new THREE.Box3().setFromObject(cloned)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 0.4 / maxDim

  return (
    <primitive
      object={cloned}
      position={[0, pedestalTop + 0.01, 0]}
      scale={scale}
      castShadow
    />
  )
}
