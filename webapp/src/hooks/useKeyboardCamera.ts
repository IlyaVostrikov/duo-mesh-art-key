import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const DOLLY_SPEED = 0.25
const PAN_SPEED = 0.35
const ZOOM_SPEED = 0.5

/** FOV range: 0=default 42°, 1=zoomed-in 20°, -1=zoomed-out 62° */
const FOV_DEFAULT = 42
const FOV_NEAR = 20
const FOV_FAR = 62

export interface NavDir {
  v: number    // -1 back, 0 none, +1 forward (dolly)
  h: number    // -1 left, 0 none, +1 right (pan)
  zoom: number // -1 out, 0 none, +1 in (FOV-based zoom)
}

interface CameraInput {
  dollyRef: React.MutableRefObject<number>
  panRef: React.MutableRefObject<number>
  zoomRef: React.MutableRefObject<number>
  ePressedRef: React.MutableRefObject<boolean>
}

/**
 * Arrow-key + virtual camera control: ↑↓ dolly, ←→ pan, FOV zoom.
 * Uses refs (no React state) — read values in r3f useFrame, not in JSX.
 *
 * @param virtualDirRef — optional ref for on-screen button input; merged with keyboard direction
 */
export function useKeyboardCamera(
  enabled: boolean,
  trackEKey = false,
  virtualDirRef?: React.MutableRefObject<NavDir>,
): CameraInput {
  const dollyRef = useRef(0)
  const panRef = useRef(0)
  const zoomRef = useRef(0)
  const dirRef = useRef({ v: 0, h: 0 })
  const ePressedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp')    { e.preventDefault(); dirRef.current.v = 1 }
      if (e.key === 'ArrowDown')  { e.preventDefault(); dirRef.current.v = -1 }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); dirRef.current.h = -1 }
      if (e.key === 'ArrowRight') { e.preventDefault(); dirRef.current.h = 1 }
      if (trackEKey && (e.key === 'e' || e.key === 'E')) { ePressedRef.current = true }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown')    { dirRef.current.v = 0 }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { dirRef.current.h = 0 }
      if (trackEKey && (e.key === 'e' || e.key === 'E'))   { ePressedRef.current = false }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [enabled, trackEKey])

  useEffect(() => {
    if (!enabled) return
    let frame: number
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const { v: kv, h: kh } = dirRef.current
      const { v: vv = 0, h: vh = 0, zoom: vz = 0 } = virtualDirRef?.current ?? {}
      const v = kv || vv
      const h = kh || vh
      if (v !== 0) dollyRef.current = THREE.MathUtils.clamp(dollyRef.current + v * DOLLY_SPEED * dt, 0, 1)
      if (h !== 0) panRef.current   = THREE.MathUtils.clamp(panRef.current   + h * PAN_SPEED   * dt, -1, 1)
      if (vz !== 0) zoomRef.current = THREE.MathUtils.clamp(zoomRef.current  + vz * ZOOM_SPEED * dt, -1, 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, virtualDirRef])

  return { dollyRef, panRef, zoomRef, ePressedRef }
}

export { FOV_DEFAULT, FOV_NEAR, FOV_FAR }
