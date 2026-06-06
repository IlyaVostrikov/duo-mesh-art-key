import { useEffect, useRef } from 'react'

interface ChainNode {
  hash: string
  role: string
  icon: React.ReactNode
}

const NODES: ChainNode[] = [
  {
    hash: '0x1a · genesis',
    role: 'Художник',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" /><path d="M5 7.6l14 8.8" /><path d="M19 7.6l-14 8.8" />
      </svg>
    ),
  },
  {
    hash: '0x7c · 2026',
    role: 'Коллекционер',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.1" /><path d="M5.5 19c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3" />
      </svg>
    ),
  },
  {
    hash: '0x3f · 2027',
    role: 'Галерея',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9l8-4 8 4" /><path d="M6.5 9.5v8M10 9.5v8M14 9.5v8M17.5 9.5v8" /><path d="M4.5 19h15" />
      </svg>
    ),
  },
  {
    hash: '0xb2 · 2029',
    role: 'Аукцион',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 4.5l6 6-2.6 2.6-6-6z" /><path d="M10.4 7.6L4 14" /><path d="M3.5 20h9" />
      </svg>
    ),
  },
  {
    hash: '0xe0 · 2031',
    role: 'Коллекционер',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="3.1" /><path d="M5.5 19c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3" />
      </svg>
    ),
  },
]

function smooth(t: number) { return t * t * (3 - 2 * t) }
function outCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

export function LandingOwnershipChain() {
  const sectionRef = useRef<HTMLElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const n = NODES.length
    const loop = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const total = rect.height - vh
      const p = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : (rect.top <= 0 ? 1 : 0)

      const tp = reduced ? 1 : smooth(Math.max(0, Math.min(1, (p - 0.08) / 0.80)))

      // Fill bar
      if (fillRef.current) fillRef.current.style.width = `${tp * 100}%`

      // Pulse
      if (pulseRef.current) {
        pulseRef.current.style.left = `${tp * 100}%`
        pulseRef.current.style.opacity = String(tp > 0 && tp < 1 ? 1 : 0)
      }

      // Nodes
      nodeRefs.current.forEach((nd, i) => {
        if (!nd) return
        const at = i / (n - 1)
        const lp = Math.max(0, Math.min(1, (tp - at) / 0.07 + 0.5))
        const e = outCubic(lp)
        const lit = lp > 0.5

        // Dot
        const dot = nd.querySelector('.ak-node-dot') as HTMLElement
        if (dot) {
          dot.style.background = lit ? 'var(--ak-ink)' : 'var(--ak-paper)'
          dot.style.borderColor = lit ? 'var(--ak-ink)' : 'var(--ak-hair)'
          dot.style.boxShadow = lit ? '0 0 0 4px rgba(22,20,15,.06)' : 'none'
        }

        // Tick
        const tick = nd.querySelector('.ak-node-tick') as HTMLElement
        if (tick) tick.style.height = `${e * 18}px`

        // Icon
        const ico = nd.querySelector('.ak-node-ico') as HTMLElement
        if (ico) {
          ico.style.opacity = String(e)
          ico.style.transform = `translateX(-50%) scale(${0.7 + 0.3 * e})`
          ico.style.borderColor = e > 0.6 ? 'var(--ak-ink)' : 'var(--ak-hair)'
          ico.style.color = e > 0.6 ? 'var(--ak-ink)' : 'var(--ak-ink-3)'
        }

        // Ring
        const ring = nd.querySelector('.ak-node-ring') as HTMLElement
        if (ring) {
          ring.style.opacity = String(Math.sin(Math.min(lp, 1) * Math.PI) * 0.5)
          ring.style.transform = `scale(${0.6 + lp * 0.9})`
        }

        // Stroke
        const strokes = nd.querySelectorAll('.ak-node-stroke')
        strokes.forEach((s) => {
          ;(s as SVGPathElement).style.strokeDashoffset = String(1 - e)
        })

        // Hash
        const hash = nd.querySelector('.ak-node-hash') as HTMLElement
        if (hash) {
          hash.style.opacity = String(e * 0.95)
          hash.style.transform = `translateX(-50%) translateY(${(1 - e) * 6}px)`
        }

        // Role
        const role = nd.querySelector('.ak-node-role') as HTMLElement
        if (role) {
          role.style.opacity = String(e)
          role.style.transform = `translateX(-50%) translateY(${(1 - e) * 8}px)`
        }
      })

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <section ref={sectionRef} className="ak-chain" id="ak-chain">
      <div className="ak-stage">
        <div className="ak-chain-head">
          <p className="ak-kicker">
            <span className="ak-num">03</span> — Цепочка владения
          </p>
          <h2>Каждая передача владения фиксируется математически.</h2>
        </div>
        <div className="ak-chain-stage-inner">
          <div className="ak-chain-track">
            <div
              ref={fillRef}
              style={{
                position: 'absolute', left: 0, top: 0, height: 1, width: '0%',
                background: 'var(--ak-ink)',
              }}
            />
            <div
              ref={pulseRef}
              style={{
                position: 'absolute', top: '50%', left: 0,
                width: 7, height: 7, borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--ak-ink)',
                boxShadow: '0 0 0 4px rgba(22,20,15,.10), 0 0 18px 5px rgba(22,20,15,.28)',
                opacity: 0, pointerEvents: 'none',
              }}
            />
            <div className="ak-chain-nodes">
              {NODES.map((node, i) => (
                <div
                  key={i}
                  ref={(el) => { nodeRefs.current[i] = el }}
                  className="ak-node"
                >
                  <span className="ak-node-hash">{node.hash}</span>
                  <span className="ak-node-ico">
                    <span className="ak-node-ring" />
                    <span className="ak-node-stroke">{node.icon}</span>
                  </span>
                  <span className="ak-node-tick" />
                  <span className="ak-node-dot" />
                  <span className="ak-node-role">{node.role}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="ak-chain-foot">
            От мастерской до коллекции — неразрывная цепь подлинности
          </p>
        </div>
      </div>
    </section>
  )
}
