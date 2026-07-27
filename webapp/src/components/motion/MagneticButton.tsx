import { useRef, useState, useCallback, type MouseEvent, type ReactNode } from 'react'

interface MagneticButtonProps {
  children: ReactNode
  /** Maximum pull distance in px */
  strength?: number
  /** Transition speed factor */
  speed?: number
  onClick?: () => void
}

/**
 * Button that magnetically follows the cursor within a bounded radius.
 * On leave, springs back to center. Complements the CustomCursor.
 */
export function MagneticButton({ children, strength = 8, speed = 0.18, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const frameRef = useRef<number>(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    targetRef.current.x = (e.clientX - cx) * 0.5
    targetRef.current.y = (e.clientY - cy) * 0.5
  }, [])

  const onLeave = useCallback(() => {
    targetRef.current.x = 0
    targetRef.current.y = 0
  }, [])

  const onEnter = useCallback(() => {
    if (frameRef.current) return
    const tick = () => {
      const c = currentRef.current
      const t = targetRef.current
      c.x += (t.x - c.x) * speed
      c.y += (t.y - c.y) * speed
      setPos({
        x: Math.max(-strength, Math.min(strength, c.x)),
        y: Math.max(-strength, Math.min(strength, c.y)),
      })

      if (Math.abs(t.x - c.x) > 0.05 || Math.abs(t.y - c.y) > 0.05) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = 0
      }
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [speed, strength])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0s',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
