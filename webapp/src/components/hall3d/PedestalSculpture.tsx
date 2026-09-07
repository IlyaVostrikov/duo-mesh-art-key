import { useRef, useState, useEffect, useMemo, memo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { Hall3DArtwork } from './Hall3DScene'
import { PEDESTAL_PRESETS } from './customization'

interface PedestalSculptureProps {
  artwork: Hall3DArtwork
  position: [number, number, number]
  hovered: boolean
  onHover: (hovered: boolean) => void
  onClick: () => void
  pedestalStyle?: string
}

const PEDESTAL_W = 0.45
const PEDESTAL_H = 0.12
const PEDESTAL_D = 0.45

/** A 3D sculpture on a minimalist pedestal, placed on the floor. */
export const PedestalSculpture = memo(function PedestalSculpture({
  artwork,
  position,
  hovered,
  onHover,
  onClick,
  pedestalStyle = 'marble',
}: PedestalSculptureProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const preset = PEDESTAL_PRESETS[pedestalStyle] ?? PEDESTAL_PRESETS.marble

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Pedestal — style-driven */}
      <mesh
        position={[0, PEDESTAL_H / 2, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[PEDESTAL_W, PEDESTAL_H, PEDESTAL_D]} />
        <meshStandardMaterial
          color={preset.color}
          roughness={preset.roughness}
          metalness={preset.metalness}
          emissive={hovered ? '#111110' : '#000000'}
          emissiveIntensity={hovered ? 0.08 : 0}
        />
      </mesh>

      {/* 3D model on top of pedestal — loaded imperatively, no suspend */}
      {artwork.modelUrl && (
        <SculptureModel
          key={artwork.modelUrl}
          modelUrl={artwork.modelUrl}
          pedestalTop={PEDESTAL_H}
        />
      )}

      {/* Hover glow — two offset lights, wide soft wash */}
      {hovered && (
        <>
          <pointLight position={[-0.25, PEDESTAL_H + 0.75, 0.5]} intensity={0.45} distance={4} color="#fffaf0" />
          <pointLight position={[0.25, PEDESTAL_H + 0.75, 0.5]} intensity={0.45} distance={4} color="#fffaf0" />
        </>
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

/** Loads and auto-scales the GLB model imperatively — no useGLTF / useLoader (no suspend). */
function SculptureModel({
  modelUrl,
  pedestalTop,
}: {
  modelUrl: string
  pedestalTop: number
}) {
  const [cloned, setCloned] = useState<THREE.Group | null>(null)

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let ownedScene: THREE.Group | null = null
    const disposeScene = (scene: THREE.Group) => {
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      const textures = new Set<THREE.Texture>()
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        geometries.add(child.geometry)
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          materials.add(material)
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) textures.add(value)
          }
        }
      })
      textures.forEach((texture) => texture.dispose())
      materials.forEach((material) => material.dispose())
      geometries.forEach((geometry) => geometry.dispose())
    }

    const loader = new GLTFLoader()

    // Draco decoder (if models use compression)
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    loader.setDRACOLoader(dracoLoader)

    console.log('[PedestalSculpture] loading:', modelUrl)

    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) { disposeScene(gltf.scene); return }
        console.log('[PedestalSculpture] loaded:', modelUrl)
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.Material
            console.log('[PedestalSculpture] mesh:', child.name || '(unnamed)',
              'material:', mat.type,
              'map:', (mat as THREE.MeshStandardMaterial).map ? 'YES' : 'null',
              'vertexCount:', child.geometry?.attributes?.position?.count ?? '?')
          }
        })
        if (!cancelled) {
          ownedScene = gltf.scene
          setCloned(gltf.scene)
        }
      },
      (evt) => {
        if (evt.total > 0) {
          console.log(`[PedestalSculpture] progress: ${Math.round((evt.loaded / evt.total) * 100)}%`)
        }
      },
      (err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[PedestalSculpture] FAILED to load:', modelUrl, msg)
        // Check for common issues
        if (msg.includes('Draco') || msg.includes('draco')) {
          console.error('[PedestalSculpture] Model uses Draco compression — need DRACOLoader')
        } else if (msg.includes('404')) {
          console.error('[PedestalSculpture] Model file not found:', modelUrl)
        } else if (msg.includes('format') || msg.includes('parse')) {
          console.error('[PedestalSculpture] Model format error — may need MeshoptDecoder or is corrupted')
        }
        setLoadError(true)
      },
    )
    return () => {
      cancelled = true
      dracoLoader.dispose()
      if (ownedScene) disposeScene(ownedScene)
    }
  }, [modelUrl])

  // Center and scale the model to fit ~1.3m tall (target 1.2–1.5m)
  const fitted = useMemo(() => {
    if (!cloned) return null
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (!Number.isFinite(maxDim) || maxDim <= 0) return null
    const center = box.getCenter(new THREE.Vector3())
    const scale = 1.3 / maxDim
    return { scale, position: [-center.x * scale, pedestalTop + 0.01 - box.min.y * scale, -center.z * scale] as [number, number, number] }
  }, [cloned, pedestalTop])
  if (loadError) {
    return (
      <Html center position={[0, pedestalTop + 0.3, 0]}>
        <div role="alert" className="rounded bg-background p-3 text-foreground">
          Не удалось загрузить модель / Model unavailable
        </div>
      </Html>
    )
  }
  if (!cloned) return null
  if (!fitted) return null

  return (
    <group position={fitted.position} scale={fitted.scale}>
      <primitive object={cloned} dispose={null} />
    </group>
  )
}
