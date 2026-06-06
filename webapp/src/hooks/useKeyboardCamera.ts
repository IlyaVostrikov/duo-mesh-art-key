import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const DOLLY_SPEED = 0.25
const PAN_SPEED = 0.35

interface CameraInput {
  /** Ref to current dolly value (0=far, 1=near). Read in useFrame, NOT in render. */
  dollyRef: React.MutableRefObject<number>
  /** Ref to current pan value (-1=left, +1=right). Read in useFrame, NOT in render. */
  panRef: React.MutableRefObject<number>
  ePressedRef: React.MutableRefObject<boolean>
}

/**
 * Arrow-key camera control: ↑↓ dolly, ←→ pan.
 * Uses refs (no React state) — read values in r3f useFrame, not in JSX.
 */
export function useKeyboardCamera(enabled: boolean, trackEKey = false): CameraInput {
  const dollyRef = useRef(0)
  const panRef = useRef(0)
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
      const { v, h } = dirRef.current
      if (v !== 0) dollyRef.current = THREE.MathUtils.clamp(dollyRef.current + v * DOLLY_SPEED * dt, 0, 1)
      if (h !== 0) panRef.current   = THREE.MathUtils.clamp(panRef.current   + h * PAN_SPEED   * dt, -1, 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled])

  return { dollyRef, panRef, ePressedRef }
}
