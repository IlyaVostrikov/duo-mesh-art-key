import { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const LenisContext = createContext<Lenis | null>(null)

export function useLenis() {
  return useContext(LenisContext)
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const lenisRef = useRef<Lenis | null>(null)
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    if (reduced || lenisRef.current) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      gestureOrientation: 'vertical',
      touchMultiplier: 2,
    })

    lenisRef.current = lenis

    const raf = (time: number) => {
      lenis.raf(time)
      rafIdRef.current = requestAnimationFrame(raf)
    }
    rafIdRef.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafIdRef.current)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  return (
    <LenisContext.Provider value={lenisRef.current}>
      {children}
    </LenisContext.Provider>
  )
}
