import { useRef, useState, useEffect } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

interface RevealOnScrollProps {
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  threshold?: number
  className?: string
}

const INITIAL: Record<string, string> = {
  up: 'translateY(40px)',
  down: 'translateY(-40px)',
  left: 'translateX(40px)',
  right: 'translateX(-40px)',
}

// Spring-like easing — more dramatic, feels alive
const SPRING_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

export function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.12,
  className,
}: RevealOnScrollProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(node)
        }
      },
      { threshold, rootMargin: '0px 0px -30px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [reduced, threshold])

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0, 0)' : INITIAL[direction],
        transition: visible
          ? `opacity 0.8s ${SPRING_EASE} ${delay}ms, transform 0.8s ${SPRING_EASE} ${delay}ms`
          : 'none',
        willChange: visible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
