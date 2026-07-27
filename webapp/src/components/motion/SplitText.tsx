import { useEffect, useRef, useState } from 'react'

interface SplitTextProps {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  /** 'chars' = per-character, 'words' = per-word */
  mode?: 'chars' | 'words'
  /** Delay before animation starts (seconds) */
  delay?: number
  /** Duration per unit (seconds) */
  duration?: number
  /** Stagger between units (seconds) */
  stagger?: number
  /** Direction: up, down, or none (fade only) */
  direction?: 'up' | 'down' | 'none'
}

const dirOffset: Record<string, string> = {
  up: 'translateY(0.6em)',
  down: 'translateY(-0.6em)',
  none: 'none',
}

/**
 * Splits text into characters or words, animating each unit with a staggered
 * fade+slide reveal. Uses IntersectionObserver — triggers once on view.
 */
export function SplitText({
  text,
  as: Tag = 'span',
  mode = 'chars',
  delay = 0,
  duration = 0.4,
  stagger = 0.02,
  direction = 'up',
}: SplitTextProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const slide = dirOffset[direction]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.2 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const units = mode === 'words'
    ? text.split(/(\s+)/).filter(Boolean)
    : text.split('')

  return (
    <Tag ref={ref as any} aria-label={text}>
      {units.map((unit, i) => {
        const isSpace = mode === 'words' && /^\s+$/.test(unit)
        const transitionDelay = `${delay + i * stagger}s`

        return (
          <span
            key={i}
            aria-hidden={isSpace ? true : undefined}
            style={{
              display: 'inline-block',
              whiteSpace: isSpace ? 'pre' : undefined,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : slide,
              transition: `opacity ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${transitionDelay}, transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${transitionDelay}`,
            }}
          >
            {unit === ' ' ? ' ' : unit}
          </span>
        )
      })}
    </Tag>
  )
}
