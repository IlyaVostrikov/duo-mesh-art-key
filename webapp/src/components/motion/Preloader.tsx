import { useState, useEffect } from 'react'

export function Preloader() {
  const [visible, setVisible] = useState(() => {
    // Show only on first visit per session
    if (typeof sessionStorage === 'undefined') return false
    return !sessionStorage.getItem('duo-mesh-preloaded')
  })
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')

  useEffect(() => {
    if (!visible) return

    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('exit'), 1400)
    const t3 = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('duo-mesh-preloaded', '1')
    }, 1900)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0B0B0D]"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          transform: phase === 'enter' ? 'translateY(8px)' : 'translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Logo mark — two intersecting rings */}
        <div style={{ position: 'relative', width: 48, height: 48 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              opacity: 0.6,
              animation: 'breathe 2s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 8,
              borderRadius: '50%',
              border: '1px solid var(--text-muted)',
              opacity: 0.4,
              animation: 'breathe 2s ease-in-out infinite 0.5s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 16,
              borderRadius: '50%',
              background: 'var(--accent)',
              opacity: 0.8,
              animation: 'breathe 2s ease-in-out infinite 1s',
            }}
          />
        </div>
        <span
          className="font-display text-sm font-medium tracking-[0.2em] uppercase"
          style={{
            color: 'var(--text-secondary)',
            letterSpacing: '0.2em',
          }}
        >
          DUO MESH
        </span>
      </div>
    </div>
  )
}
