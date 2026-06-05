import { useRef, useState, useCallback, type MouseEvent, type ReactNode } from 'react'

interface ImageHoverZoomProps {
  children: ReactNode
  scale?: number
  speed?: number
  className?: string
}

/**
 * Zooms the image on hover, tracking cursor position for a parallax-like origin shift.
 * Wrap an <img> or any element — applies scale transform with transform-origin following the cursor.
 */
export function ImageHoverZoom({ children, scale = 1.12, speed = 0.15, className }: ImageHoverZoomProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('scale(1)')
  const frameRef = useRef<number>(0)
  const targetRef = useRef({ x: 0.5, y: 0.5, s: 1 })
  const currentRef = useRef({ x: 0.5, y: 0.5, s: 1 })

  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    targetRef.current.x = (e.clientX - rect.left) / rect.width
    targetRef.current.y = (e.clientY - rect.top) / rect.height
    targetRef.current.s = scale
  }, [scale])

  const onLeave = useCallback(() => {
    targetRef.current.s = 1
  }, [])

  const onEnter = useCallback(() => {
    if (frameRef.current) return
    const lerp = () => {
      const t = currentRef.current
      const g = targetRef.current
      t.x += (g.x - t.x) * speed
      t.y += (g.y - t.y) * speed
      t.s += (g.s - t.s) * speed

      setTransform(`scale(${t.s})`)
      if (ref.current) {
        ref.current.style.transformOrigin = `${t.x * 100}% ${t.y * 100}%`
      }

      if (Math.abs(g.s - t.s) > 0.001 || Math.abs(g.x - t.x) > 0.001 || Math.abs(g.y - t.y) > 0.001) {
        frameRef.current = requestAnimationFrame(lerp)
      } else {
        frameRef.current = 0
      }
    }
    frameRef.current = requestAnimationFrame(lerp)
  }, [speed])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={className}
      style={{
        transform,
        transition: 'transform-origin 0s',
        willChange: 'transform',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  )
}
