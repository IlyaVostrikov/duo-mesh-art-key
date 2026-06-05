import { useEffect, useState, useRef } from 'react'
import * as THREE from 'three'

const DOLLY_SPEED = 0.25
const PAN_SPEED = 0.35

interface CameraInput {
  dolly: number   // 0=far, 1=near
  pan: number     // -1=left, +1=right
  ePressedRef: React.MutableRefObject<boolean>
}

/** Arrow-key camera control: ↑↓ dolly, ←→ pan. Optionally tracks E-key for door interaction. */
export function useKeyboardCamera(enabled: boolean, trackEKey = false): CameraInput {
  const [dolly, setDolly] = useState(0)
  const [pan, setPan] = useState(0)
  const dirRef = useRef({ v: 0, h: 0 }) // v: +1 out, -1 in; h: -1 left, +1 right
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
      if (v !== 0) setDolly((prev) => THREE.MathUtils.clamp(prev + v * DOLLY_SPEED * dt, 0, 1))
      if (h !== 0) setPan((prev) => THREE.MathUtils.clamp(prev + h * PAN_SPEED * dt, -1, 1))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled])

  return { dolly, pan, ePressedRef }
}
