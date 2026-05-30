import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const DOT_SIZE = 8
const RING_SIZE = 32
const RING_HOVER_SIZE = 48

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  opacity: number
}

export function CustomCursor() {
  const reduced = useReducedMotion()
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const rafRef = useRef(0)
  const targetRef = useRef({ x: -100, y: -100 })
  const posRef = useRef({ x: -100, y: -100 })
  const particlesRef = useRef<Particle[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const lastSpawnRef = useRef(0)
  const hoveringRef = useRef(false)
  const visibleRef = useRef(false)

  // Sync refs to avoid RAF dep changes
  hoveringRef.current = hovering
  visibleRef.current = visible

  // Touch detection
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Main RAF loop — canvas particles + DOM cursor via refs (no React re-renders)
  useEffect(() => {
    if (isTouch || reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dot = dotRef.current
    const ring = ringRef.current

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      // Canvas particles
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = performance.now()
      const { x, y } = targetRef.current
      const cur = posRef.current
      const moving = Math.abs(x - cur.x) > 0.3 || Math.abs(y - cur.y) > 0.3

      if (moving && now - lastSpawnRef.current > 25) {
        lastSpawnRef.current = now
        const count = hoveringRef.current ? 3 : 1
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 15 + Math.random() * 40
          particlesRef.current.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 1 + Math.random() * 2,
            life: 0.5 + Math.random() * 0.6,
            maxLife: 0.5 + Math.random() * 0.6,
            opacity: 0.3 + Math.random() * 0.4,
          })
        }
      }

      const dt = Math.min(16, 16) / 1000
      const alive: Particle[] = []
      for (const p of particlesRef.current) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
        p.vx *= 0.96
        p.vy *= 0.96
        if (p.life > 0) {
          const alpha = (p.life / p.maxLife) * p.opacity
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(198,255,58,${alpha})`
          ctx.fill()
          alive.push(p)
        }
      }
      particlesRef.current = alive

      // Lerp ring position
      const dx = x - posRef.current.x
      const dy = y - posRef.current.y
      posRef.current = {
        x: posRef.current.x + dx * 0.25,
        y: posRef.current.y + dy * 0.25,
      }

      // Direct DOM manipulation — zero React re-renders
      const vis = visibleRef.current ? '1' : '0'
      if (dot) {
        dot.style.transform = `translate(${x - DOT_SIZE / 2}px, ${y - DOT_SIZE / 2}px)`
        dot.style.opacity = vis
      }
      if (ring) {
        const rs = hoveringRef.current ? RING_HOVER_SIZE : RING_SIZE
        ring.style.width = `${rs}px`
        ring.style.height = `${rs}px`
        ring.style.transform = `translate(${posRef.current.x - rs / 2}px, ${posRef.current.y - rs / 2}px)`
        ring.style.borderColor = hoveringRef.current ? 'var(--accent)' : 'var(--text-muted)'
        ring.style.boxShadow = hoveringRef.current ? '0 0 20px rgba(198,255,58,0.15)' : 'none'
        ring.style.opacity = vis
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isTouch, reduced])

  // Mouse move tracking
  useEffect(() => {
    if (isTouch || reduced) return

    let showTimeout: ReturnType<typeof setTimeout>

    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
      if (!visibleRef.current) setVisible(true)
      clearTimeout(showTimeout)
    }

    const onLeave = () => {
      showTimeout = setTimeout(() => setVisible(false), 300)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', () => {
      clearTimeout(showTimeout)
      setVisible(true)
    })

    return () => {
      clearTimeout(showTimeout)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', () => {})
    }
  }, [isTouch, reduced])

  // Hover detection
  const onHoverChange = useCallback((entering: boolean) => {
    setHovering(entering)
  }, [])

  useEffect(() => {
    if (isTouch || reduced) return

    const interactiveSelector =
      'a[href], button, [data-cursor-hover], input, textarea, select, [role="button"], label'

    const onEnter = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest(interactiveSelector)) onHoverChange(true)
    }
    const onLeave = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest(interactiveSelector)) onHoverChange(false)
    }

    document.addEventListener('mouseover', onEnter, { passive: true })
    document.addEventListener('mouseout', onLeave, { passive: true })

    return () => {
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [isTouch, reduced, onHoverChange])

  // Toggle html class
  useEffect(() => {
    if (isTouch || reduced) return
    document.documentElement.classList.add('custom-cursor-active')
    return () => {
      document.documentElement.classList.remove('custom-cursor-active')
    }
  }, [isTouch, reduced])

  if (isTouch || reduced) return null

  return createPortal(
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99997,
        }}
      />
      {/* Dot — positioned by RAF DOM write, no React render */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          background: 'var(--accent)',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 12px rgba(198,255,58,0.5), 0 0 24px rgba(198,255,58,0.2)',
        }}
      />
      {/* Ring — positioned by RAF DOM write, no React render */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: '50%',
          border: '1px solid var(--text-muted)',
          pointerEvents: 'none',
          zIndex: 99998,
          transition: 'width var(--dur) var(--ease), height var(--dur) var(--ease), border-color var(--dur) var(--ease)',
        }}
      />
    </>,
    document.body,
  )
}
