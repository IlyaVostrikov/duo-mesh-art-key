import { useState, useEffect, useRef, useCallback } from 'react'

const PRELOAD_KEY = 'duo-mesh-preloaded'
const MAX_DURATION_MS = 2800
const DISSOLVE_NORMAL = 500
const DISSOLVE_SKIP = 200

type PreloaderPhase = 'enter' | 'logo' | 'text' | 'hold' | 'exit' | 'done'

const WORDMARK = 'DUO MESH'
const TAGLINE = 'ART KEY'

export function Preloader() {
  const [phase, setPhase] = useState<PreloaderPhase>(() => {
    if (typeof sessionStorage === 'undefined') return 'done'
    if (sessionStorage.getItem(PRELOAD_KEY)) return 'done'
    return 'enter'
  })

  const [dissolveMs, setDissolveMs] = useState(DISSOLVE_NORMAL)
  const skipRef = useRef(false)
  // Split timers so phase-change cleanups don't kill sequence timers
  const seqTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const safetyTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAllTimers = useCallback(() => {
    for (const t of seqTimers.current) clearTimeout(t)
    for (const t of safetyTimers.current) clearTimeout(t)
    seqTimers.current = []
    safetyTimers.current = []
  }, [])

  // ─── Skip trigger (click / scroll / key) ───
  const triggerSkip = useCallback(() => {
    if (skipRef.current) return
    skipRef.current = true
    setDissolveMs(DISSOLVE_SKIP)
    clearAllTimers()
    setPhase('exit')
  }, [clearAllTimers])

  // ─── Mark done + persist ───
  const finish = useCallback(() => {
    setPhase('done')
    try { sessionStorage.setItem(PRELOAD_KEY, '1') } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent('preloader-done'))
  }, [])

  // ─── Max-timeout safety (once, survives phase changes) ───
  useEffect(() => {
    const t = setTimeout(finish, MAX_DURATION_MS)
    safetyTimers.current.push(t)
    return () => {
      for (const st of safetyTimers.current) clearTimeout(st)
    }
  }, [finish])

  // ─── User-interaction skip listeners ───
  useEffect(() => {
    if (phase === 'done' || phase === 'exit') return
    document.addEventListener('click', triggerSkip)
    document.addEventListener('wheel', triggerSkip, { passive: true })
    document.addEventListener('keydown', triggerSkip)
    return () => {
      document.removeEventListener('click', triggerSkip)
      document.removeEventListener('wheel', triggerSkip)
      document.removeEventListener('keydown', triggerSkip)
    }
  }, [phase, triggerSkip])

  // ─── Normal phase sequencing (once — timers must survive phase re-renders) ───
  useEffect(() => {
    if (phase !== 'enter') return

    const t1 = setTimeout(() => setPhase('logo'), 200)
    const t2 = setTimeout(() => setPhase('text'), 800)
    const t3 = setTimeout(() => setPhase('hold'), 1600)
    const t4 = setTimeout(() => setPhase('exit'), 2200)
    const t5 = setTimeout(finish, 2200 + DISSOLVE_NORMAL + 80)

    seqTimers.current = [t1, t2, t3, t4, t5]

    // Cleanup only on dismount — NOT on phase change
    return () => {
      for (const st of seqTimers.current) clearTimeout(st)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Exit transition → done ───
  useEffect(() => {
    if (phase !== 'exit') return
    const t = setTimeout(finish, dissolveMs + 80)
    return () => clearTimeout(t)
  }, [phase, dissolveMs, finish])

  if (phase === 'done') return null

  // ─── Full intro ───
  const dissolving = phase === 'exit'
  const GALLERY_BG = '#FAFAF8'

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: dissolving ? GALLERY_BG : '#0A0A0A',
        transition: dissolving
          ? `background-color ${dissolveMs}ms cubic-bezier(0.4,0,0.2,1)`
          : 'none',
        pointerEvents: dissolving ? 'none' : 'auto',
      }}
    >
      {/* Content fades out as background turns white */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dissolving ? 0 : 1,
          transition: dissolving ? `opacity ${Math.round(dissolveMs * 0.55)}ms ease` : 'none',
        }}
      >
        {/* Layer 1: EnergyRing behind logo */}
        <div style={{ position: 'relative' }}>
          <EnergyRing />
          <div
            style={{
              animation: phase === 'logo' || phase === 'text' || phase === 'hold'
                ? 'preloaderLogoEnter 0.7s cubic-bezier(0.16,1,0.3,1) both, preloaderFlicker 0.5s ease both'
                : 'none',
              opacity: phase === 'enter' ? 0 : undefined,
            }}
          >
            <LogoMark animate />
          </div>
        </div>

        {/* Layer 2: BlurredStagger text */}
        <div
          className="preloader-blur-stagger font-display"
          style={{ zIndex: 1, marginTop: '1.5rem' }}
        >
          <div className="text-4xl md:text-5xl font-bold tracking-wider text-white">
            {WORDMARK.split('').map((char, i) => (
              <span
                key={i}
                className="char"
                style={{
                  animationDelay: `${i * 60}ms`,
                  animationPlayState: phase === 'text' || phase === 'hold' || phase === 'exit'
                    ? 'running'
                    : 'paused',
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            ))}
          </div>
          <div
            className="text-sm md:text-base font-light tracking-[0.25em] text-white/50 mt-2"
            style={{ textAlign: 'center' }}
          >
            {TAGLINE.split('').map((char, i) => (
              <span
                key={i}
                className="char"
                style={{
                  animationDelay: `${WORDMARK.length * 60 + 120 + i * 50}ms`,
                  animationPlayState: phase === 'text' || phase === 'hold' || phase === 'exit'
                    ? 'running'
                    : 'paused',
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Logo mark — two intersecting rings + center dot ───

function LogoMark({ animate }: { animate: boolean }) {
  return (
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.7)',
          animation: animate ? 'breathe 2.5s ease-in-out infinite' : 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.35)',
          animation: animate ? 'breathe 2.5s ease-in-out infinite 0.6s' : 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)',
          animation: animate ? 'breathe 2.5s ease-in-out infinite 1.2s' : 'none',
        }}
      />
    </div>
  )
}

// ─── EnergyRing — subtle pulsing halo ───

function EnergyRing() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 140,
        height: 140,
        marginTop: -70,
        marginLeft: -70,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.12)',
        animation: 'energyPulse 2.2s ease-in-out infinite',
      }}
    />
  )
}
