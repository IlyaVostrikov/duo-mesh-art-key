import { useState, useEffect } from 'react'
import type { HTMLAttributes } from 'react'

interface BlurredRevealProps extends HTMLAttributes<HTMLDivElement> {
  text: string
  /** ms delay per character */
  staggerMs?: number
  /** extra className for the text container */
  textClassName?: string
  /** ms delay before starting animation */
  startDelay?: number
}

/**
 * Character-by-character blur→clear reveal.
 * Triggers automatically on `preloader-done` event, or after `startDelay` ms.
 * If preloader already finished (sessionStorage), starts immediately.
 */
export function BlurredReveal({
  text,
  staggerMs = 18,
  textClassName,
  startDelay = 0,
  className,
  ...rest
}: BlurredRevealProps) {
  const [running, setRunning] = useState(false)

  useEffect(() => {
    // Already preloaded — start after optional delay
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('duo-mesh-preloaded')) {
      const t = setTimeout(() => setRunning(true), startDelay)
      return () => clearTimeout(t)
    }

    // Wait for preloader
    const handler = () => {
      const t = setTimeout(() => setRunning(true), startDelay)
      return () => clearTimeout(t)
    }
    let cleanup: (() => void) | undefined
    const onDone = () => { cleanup = handler() }
    window.addEventListener('preloader-done', onDone, { once: true })

    // Fallback: start after 3.5s even if event never fires
    const fallback = setTimeout(() => {
      if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem('duo-mesh-preloaded')) {
        setRunning(true)
      }
    }, 3500)

    return () => {
      window.removeEventListener('preloader-done', onDone)
      clearTimeout(fallback)
      cleanup?.()
    }
  }, [startDelay])

  return (
    <div
      className={`blur-reveal-stagger ${className ?? ''}`}
      style={{
        display: 'inline',
        // Ensure no layout shift before/after animation
      }}
      {...rest}
    >
      <span className={textClassName} style={{ display: 'inline' }}>
        {text.split('').map((char, i) => (
          <span
            key={i}
            className="char"
            style={{
              animationDelay: `${i * staggerMs}ms`,
              animationPlayState: running ? 'running' : 'paused',
            }}
          >
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </span>
    </div>
  )
}
