import { useRef, useState, useEffect } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  duration?: number
  className?: string
}

export function AnimatedCounter({
  value,
  suffix = '',
  duration = 2000,
  className,
}: AnimatedCounterProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [current, setCurrent] = useState(reduced ? value : 0)
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    if (reduced) {
      setCurrent(value)
      return
    }

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true)
          observer.unobserve(node)
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [reduced])

  useEffect(() => {
    if (!triggered || reduced) return

    let rafId: number
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3
      setCurrent(Math.floor(eased * value))

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setCurrent(value)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [triggered, value, duration, reduced])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {current}
      {suffix}
    </span>
  )
}
