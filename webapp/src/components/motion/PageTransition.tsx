import { useEffect, useState, useRef, type ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const keyRef = useRef(0)

  useEffect(() => {
    keyRef.current += 1
    const key = keyRef.current
    setMounted(false)
    // Trigger enter animation after a frame
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (key === keyRef.current) setMounted(true)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [children])

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)`,
      }}
    >
      {children}
    </div>
  )
}
