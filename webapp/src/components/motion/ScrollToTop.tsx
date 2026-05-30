import { useCallback, useEffect, useRef } from 'react'
import { useLenis } from '@/components/motion/LenisProvider'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const THRESHOLD = 400

export function ScrollToTop() {
  const lenis = useLenis()
  const reduced = useReducedMotion()
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleScroll = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const scrolled = window.scrollY > THRESHOLD
    btn.style.opacity = scrolled ? '1' : '0'
    btn.style.pointerEvents = scrolled ? 'auto' : 'none'
    btn.style.transform = scrolled ? 'translateY(0)' : 'translateY(12px)'
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (reduced) return null

  return (
    <button
      ref={btnRef}
      onClick={() => lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 100,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        opacity: 0,
        pointerEvents: 'none',
        transform: 'translateY(12px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: 'var(--elev-1)',
      }}
    >
      ↑
    </button>
  )
}
