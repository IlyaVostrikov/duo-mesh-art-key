import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTextureCache } from '@/hooks/useTextureCache'
import { useKeyboardCamera } from '@/hooks/useKeyboardCamera'
import { RoomGroup, EYE } from './RoomGroup'
import { type SlotLayout, computeSlots, computeWallWidth } from './layoutTemplates'
import { roomCenterX, type HallData } from './hallOrdering'
import {
  FOV, CAMERA_Z_FAR, CAMERA_Z_NEAR, LERP_SPEED, MOUSE_YAW_DEG, MOUSE_PITCH_DEG,
  TRANSITION_DURATION, toRad, easeInOutCubic,
} from './constants'
import { LIGHTING_PRESETS } from './customization'
import * as THREE from 'three'

function resolveLayout(hall: HallData): SlotLayout {
  const count = hall.artworks.length
  if (count === 0) return { name: 'empty', capacity: 0, slots: [] }
  return {
    name: count <= 4 ? 'Один ряд / Single Row' : 'Салонная развеска / Salon Hang',
    capacity: count,
    slots: computeSlots(count),
  }
}

// ─── In-Canvas content ───

interface MultiHallContentProps {
  halls: HallData[]
  layouts: SlotLayout[]
  wallWidths: number[]
  centers: number[]
  initialRoomIndex: number
  onRoomChange: (slug: string) => void
  onArtworkClick: (id: string) => void
}

function MultiHallContent({
  halls, layouts, wallWidths, centers, initialRoomIndex,
  onRoomChange, onArtworkClick,
}: MultiHallContentProps) {
  const [currentRoom, setCurrentRoom] = useState(initialRoomIndex)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [doorHovered, setDoorHovered] = useState<{ prev: boolean; next: boolean }>({ prev: false, next: false })

  // Camera state refs
  const camRef = useRef<THREE.PerspectiveCamera>(null!)
  const currentX = useRef(centers[initialRoomIndex] ?? 0)
  const currentZ = useRef(CAMERA_Z_FAR)
  const currentYaw = useRef(0)
  const currentPitch = useRef(0)
  const transitionRef = useRef({ active: false, fromX: 0, toX: 0, elapsed: 0, toRoom: 0 })
  const mouseNorm = useRef({ x: 0, y: 0 })

  const { dolly, pan, ePressedRef } = useKeyboardCamera(true, true)

  // ─── Progressive texture loading: current + adjacent rooms only ───
  const visibleIndices = useMemo(() => {
    const set = new Set<number>()
    set.add(currentRoom)
    if (currentRoom > 0) set.add(currentRoom - 1)
    if (currentRoom < halls.length - 1) set.add(currentRoom + 1)
    return set
  }, [currentRoom, halls.length])

  const posterUrls = useMemo(
    () => {
      const urls: string[] = []
      visibleIndices.forEach((i) => {
        halls[i]?.artworks.forEach((a) => { if (a.posterUrl) urls.push(a.posterUrl) })
      })
      return urls
    },
    [halls, visibleIndices],
  )
  const textureCache = useTextureCache(posterUrls)

  // ─── Camera init ───
  const { camera } = useThree()
  useEffect(() => {
    const pcam = camera as THREE.PerspectiveCamera
    pcam.position.set(centers[initialRoomIndex] ?? 0, EYE, CAMERA_Z_FAR)
    pcam.fov = FOV
    pcam.near = 0.1
    pcam.far = 100
    pcam.lookAt(centers[initialRoomIndex] ?? 0, EYE, 0)
    pcam.updateProjectionMatrix()
    camRef.current = pcam
    currentX.current = centers[initialRoomIndex] ?? 0
  }, [camera, centers, initialRoomIndex])

  // Mouse tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseNorm.current = {
        x: THREE.MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1),
        y: THREE.MathUtils.clamp(-((e.clientY / window.innerHeight) * 2 - 1), -1, 1),
      }
    }
    const onLeave = () => { mouseNorm.current = { x: 0, y: 0 } }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave) }
  }, [])

  // Door transition trigger
  const startTransition = useCallback((direction: 'prev' | 'next') => {
    const nextRoom = direction === 'prev' ? currentRoom - 1 : currentRoom + 1
    if (nextRoom < 0 || nextRoom >= halls.length) return
    const fromX = centers[currentRoom] ?? 0
    const toX = centers[nextRoom] ?? 0
    transitionRef.current = { active: true, fromX, toX, elapsed: 0, toRoom: nextRoom }
  }, [currentRoom, centers, halls.length])

  // popstate listener
  useEffect(() => {
    const onPopState = () => {
      const slug = window.location.pathname.split('/hall/')[1]
      const idx = halls.findIndex((h) => h.slug === slug)
      if (idx >= 0 && idx !== currentRoom) {
        const fromX = centers[currentRoom] ?? 0
        const toX = centers[idx] ?? 0
        transitionRef.current = { active: true, fromX, toX, elapsed: 0, toRoom: idx }
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [halls, centers, currentRoom])

  // Main frame loop
  useFrame((_, dt) => {
    if (!camRef.current) return
    const pcam = camRef.current
    const tr = transitionRef.current

    // ─── Transition ───
    if (tr.active) {
      tr.elapsed += dt
      const t = Math.min(1, tr.elapsed / TRANSITION_DURATION)
      const et = easeInOutCubic(t)

      const x = THREE.MathUtils.lerp(tr.fromX, tr.toX, et)
      const zArc = CAMERA_Z_FAR - Math.sin(et * Math.PI) * 1.5

      pcam.position.set(x, EYE, zArc)
      pcam.lookAt(x, EYE, 0)
      currentX.current = x
      currentZ.current = zArc

      if (t >= 1) {
        tr.active = false
        currentX.current = tr.toX
        setCurrentRoom(tr.toRoom)
        onRoomChange(halls[tr.toRoom]?.slug ?? '')
      }
      return
    }

    // ─── Idle ───
    const halfW = (wallWidths[currentRoom] ?? 14) / 2

    const targetZ = THREE.MathUtils.lerp(CAMERA_Z_FAR, CAMERA_Z_NEAR, dolly)
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, LERP_SPEED * dt))
    const z = currentZ.current

    const maxPanX = Math.max(0, halfW - 1.0)
    const panOffset = pan * maxPanX
    const targetX = (centers[currentRoom] ?? 0) + panOffset
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, Math.min(1, LERP_SPEED * dt))

    const { x: mx, y: my } = mouseNorm.current
    const targetYaw = mx * toRad(MOUSE_YAW_DEG)
    const targetPitch = my * toRad(MOUSE_PITCH_DEG)
    currentYaw.current = THREE.MathUtils.lerp(currentYaw.current, targetYaw, Math.min(1, 3 * dt))
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch, Math.min(1, 3 * dt))

    const yaw = currentYaw.current
    const pitch = currentPitch.current
    const lookX = currentX.current + z * Math.tan(yaw)
    const lookY = EYE + z * Math.tan(pitch)

    pcam.position.set(currentX.current, EYE + z * Math.tan(pitch) * 0.08, z)
    pcam.lookAt(lookX, lookY, 0)

    // E key — door proximity
    if (ePressedRef.current && !tr.active) {
      ePressedRef.current = false
      const camX = currentX.current
      const roomCenter = centers[currentRoom] ?? 0

      if (currentRoom < halls.length - 1) {
        const doorX = roomCenter + halfW
        if (Math.sqrt((camX - doorX) ** 2 + (z - 1.0) ** 2) < 4.0) { startTransition('next'); return }
      }
      if (currentRoom > 0) {
        const doorX = roomCenter - halfW
        if (Math.sqrt((camX - doorX) ** 2 + (z - 1.0) ** 2) < 4.0) { startTransition('prev'); return }
      }
    }
  })

  const handleHover = useCallback((id: string | null) => setHoveredId(id), [])
  const handleDoorHover = useCallback((dir: 'prev' | 'next' | null) => {
    setDoorHovered({ prev: dir === 'prev', next: dir === 'next' })
  }, [])

  const doorLabels = useMemo(() => {
    const prev = currentRoom > 0 ? halls[currentRoom - 1]?.title ?? '' : ''
    const next = currentRoom < halls.length - 1 ? halls[currentRoom + 1]?.title ?? '' : ''
    return { prev, next }
  }, [currentRoom, halls])

  // Lighting from current room's customization, or defaults
  const currentLighting = useMemo(() => {
    const c = halls[currentRoom]?.customization as Record<string, string> | null | undefined
    const preset = c?.lightingPreset ?? 'warm'
    return LIGHTING_PRESETS[preset] ?? LIGHTING_PRESETS.warm
  }, [halls, currentRoom])

  return (
    <>
      <ambientLight intensity={currentLighting.ambientIntensity} color={currentLighting.ambientColor} />
      <hemisphereLight args={[currentLighting.hemiSky, currentLighting.hemiGround, currentLighting.hemiIntensity]} />

      {halls.map((hall, i) => {
        // Only render current + adjacent rooms (transitions always go to adjacent)
        if (!visibleIndices.has(i)) return null
        return (
          <group key={hall.slug} position={[centers[i] ?? 0, 0, 0]}>
            <RoomGroup
              hall={hall}
              layout={layouts[i]!}
              wallWidth={wallWidths[i]!}
              hasPrevRoom={i > 0}
              hasNextRoom={i < halls.length - 1}
              prevLabel={doorLabels.prev}
              nextLabel={doorLabels.next}
              isCurrentRoom={i === currentRoom}
              isAdjacentRoom={i === currentRoom - 1 || i === currentRoom + 1}
              textureCache={textureCache}
              hoveredId={hoveredId}
              onHover={handleHover}
              onArtworkClick={onArtworkClick}
              onDoorClick={startTransition}
              doorHovered={doorHovered}
              onDoorHover={handleDoorHover}
            />
          </group>
        )
      })}
    </>
  )
}

// ─── Outer wrapper ───

interface MultiHallSceneProps {
  halls: HallData[]
  initialRoomIndex: number
  onRoomChange: (slug: string) => void
  onArtworkClick?: (id: string) => void
}

export function MultiHallScene({ halls, initialRoomIndex, onRoomChange, onArtworkClick }: MultiHallSceneProps) {
  const layouts = useMemo(() => halls.map((h) => resolveLayout(h)), [halls])
  const wallWidths = useMemo(() => layouts.map((l) => computeWallWidth(l.slots)), [layouts])
  const centers = useMemo(() => wallWidths.map((_, i) => roomCenterX(i, wallWidths)), [wallWidths])

  return (
    <div className="w-full h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Canvas
        dpr={[1, 2]}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.6,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <MultiHallContent
          halls={halls}
          layouts={layouts}
          wallWidths={wallWidths}
          centers={centers}
          initialRoomIndex={initialRoomIndex}
          onRoomChange={onRoomChange}
          onArtworkClick={onArtworkClick ?? (() => {})}
        />
      </Canvas>
    </div>
  )
}
