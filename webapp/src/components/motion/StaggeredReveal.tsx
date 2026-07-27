import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'

interface StaggeredRevealProps {
  children: ReactNode
  /** Delay between each child reveal (seconds) */
  stagger?: number
  /** Initial delay before first child (seconds) */
  initialDelay?: number
  /** Direction: 'up' | 'down' | 'left' | 'right' */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Trigger when element enters viewport */
  threshold?: number
}

const dirOffset: Record<string, { x: number; y: number }> = {
  up:    { x: 0, y: 24 },
  down:  { x: 0, y: -24 },
  left:  { x: 24, y: 0 },
  right: { x: -24, y: 0 },
}

/**
 * Reveals children sequentially with a staggered delay.
 * Each child fades in and slides from the specified direction.
 * Uses IntersectionObserver — triggers once when entering viewport.
 */
export function StaggeredReveal({
  children,
  stagger = 0.06,
  initialDelay = 0,
  direction = 'up',
  threshold = 0.1,
}: StaggeredRevealProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const offset = dirOffset[direction]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  const kids = Children.toArray(children).filter(isValidElement)

  return (
    <div ref={ref}>
      {kids.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? 'translate(0, 0)'
              : `translate(${offset.x}px, ${offset.y}px)`,
            transition: `opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${initialDelay + i * stagger}s, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${initialDelay + i * stagger}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
