import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const LenisContext = createContext<Lenis | null>(null)

export function useLenis() {
  return useContext(LenisContext)
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    if (reduced || lenis) return

    const instance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      gestureOrientation: 'vertical',
      touchMultiplier: 2,
    })

    setLenis(instance)

    const raf = (time: number) => {
      instance.raf(time)
      rafIdRef.current = requestAnimationFrame(raf)
    }
    rafIdRef.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafIdRef.current)
      instance.destroy()
    }
  }, [reduced])

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  )
}
