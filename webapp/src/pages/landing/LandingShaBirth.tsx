import { useEffect, useRef, useCallback } from 'react'

const BEATS = [
  {
    title: 'Произведение.',
    desc: 'Тишина галереи. Одна работа в музейном свете.',
  },
  {
    title: 'Невидимая сетка координат.',
    desc: 'Изображение раскладывается на точные числовые координаты.',
  },
  {
    title: 'Каждая работа — это числа.',
    desc: 'Точки, линии, структура. Элегантная математика, а не код хакера.',
  },
  {
    title: 'Один отпечаток. Невозможно подделать.',
    desc: 'Из миллионов координат рождается единственная подпись.',
  },
]

const HASH = 'a3f9c27e8b41d605fae29c7b3d18e0a4c6592f7188bd3e0a47c91f6e2b5d8a0c'
const HEX = '0123456789abcdef'

const COLS = 30
const ROWS = 40

interface Pt {
  u: number; v: number
  ox: number; oy: number
  sp: number; ph: number
}

function field(u: number, v: number): [number, number, number] {
  let L = 0.80 - v * 0.30
  L += Math.sin(v * 11 + u * 1.4) * 0.05
  if (v > 0.42 && v < 0.66 && u > 0.18 && u < 0.74) L -= 0.34
  if (v > 0.10 && v < 0.30 && u > 0.55 && u < 0.9) L += 0.12
  if (u > 0.30 && u < 0.40) L -= 0.10
  L = Math.max(0.06, Math.min(0.96, L))
  return [Math.round(244 * L + 10), Math.round(240 * L + 9), Math.round(232 * L + 8)]
}

function smooth(t: number) { return t * t * (3 - 2 * t) }

export function LandingShaBirth() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hashRef = useRef<HTMLElement>(null)
  const hashBoxRef = useRef<HTMLDivElement>(null)
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const ptsRef = useRef<Pt[]>([])

  const draw = useCallback((p: number, t: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.width, h = cv.height

    ctx.clearRect(0, 0, w, h)

    const aw = Math.min(w * 0.42, h * 0.46)
    const ah = aw * 1.32
    const ax = (w - aw) / 2
    const ay = h * 0.40 - ah / 2

    const pSolid = 1 - smooth(Math.max(0, Math.min(1, (p - 0.34) / 0.18)))
    const pGrid = smooth(Math.max(0, Math.min(1, (p - 0.24) / 0.16))) *
                  (1 - smooth(Math.max(0, Math.min(1, (p - 0.66) / 0.14))))
    const pDisp = smooth(Math.max(0, Math.min(1, (p - 0.40) / 0.30)))
    const pConv = smooth(Math.max(0, Math.min(1, (p - 0.70) / 0.30)))
    const pHash = smooth(Math.max(0, Math.min(1, (p - 0.72) / 0.22)))

    // Solid artwork
    if (pSolid > 0.01) {
      const cx = aw / COLS, cy = ah / ROWS
      ctx.globalAlpha = pSolid
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const c = field((i + 0.5) / COLS, (j + 0.5) / ROWS)
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
          ctx.fillRect(ax + i * cx - 0.5, ay + j * cy - 0.5, cx + 1, cy + 1)
        }
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(239,236,230,.10)'
      ctx.lineWidth = DPR
      ctx.strokeRect(ax, ay, aw, ah)
    }

    // Grid overlay
    if (pGrid > 0.01 && pDisp < 0.99) {
      ctx.globalAlpha = pGrid * 0.5
      ctx.strokeStyle = 'rgba(239,236,230,.5)'
      ctx.lineWidth = DPR * 0.6
      ctx.beginPath()
      for (let i = 0; i <= 10; i++) {
        const x = ax + aw * i / 10
        ctx.moveTo(x, ay); ctx.lineTo(x, ay + ah)
      }
      for (let j = 0; j <= 13; j++) {
        const y = ay + ah * j / 13
        ctx.moveTo(ax, y); ctx.lineTo(ax + aw, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Dispersion → convergence
    if (pDisp > 0.01) {
      const pts = ptsRef.current
      const lineY = ay + ah * 0.5
      const drift = pDisp * (1 - pConv)

      const P = pts.map(pt => {
        const bx = ax + pt.u * aw, by = ay + pt.v * ah
        const fx = bx + pt.ox * aw * 0.16 * drift + Math.sin(t * 0.0006 * pt.sp + pt.ph) * 6 * DPR * drift
        const fy = by + pt.oy * ah * 0.10 * drift + Math.cos(t * 0.0006 * pt.sp + pt.ph) * 6 * DPR * drift
        return {
          x: bx + (ax + aw * 0.5 + (pt.u - 0.5) * aw * 0.86 - bx) * pConv + (fx - bx) * (1 - pConv),
          y: by + (lineY + pt.oy * 4 * DPR * (1 - pConv) - by) * pConv + (fy - by) * (1 - pConv),
          c: field(pt.u, pt.v),
        }
      })

      // Connecting lines
      ctx.globalAlpha = Math.min(pDisp, 1) * (1 - pConv * 0.6) * 0.7
      ctx.strokeStyle = 'rgba(239,236,230,.6)'
      ctx.lineWidth = DPR * 0.6
      ctx.beginPath()
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const idx = j * COLS + i
          const a = P[idx]
          if (i < COLS - 1) { const b = P[idx + 1]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y) }
          if (j < ROWS - 1) { const b = P[idx + COLS]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y) }
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1

      // Dots
      for (const q of P) {
        const r = DPR * (1.4 + pConv * 0.6)
        ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2)
        const lum = (q.c[0] + q.c[1] + q.c[2]) / 765
        ctx.fillStyle = `rgba(239,236,230,${(0.55 + 0.45 * lum) * Math.min(pDisp, 1)})`
        ctx.fill()
      }

      // Convergence glow
      if (pConv > 0.01) {
        ctx.globalAlpha = pConv * 0.5
        const rg = ctx.createRadialGradient(ax + aw / 2, lineY, 0, ax + aw / 2, lineY, aw * 0.62)
        rg.addColorStop(0, 'rgba(239,236,230,.22)')
        rg.addColorStop(1, 'rgba(239,236,230,0)')
        ctx.fillStyle = rg
        ctx.fillRect(ax - aw * 0.3, lineY - ah * 0.2, aw * 1.6, ah * 0.4)

        ctx.globalAlpha = pConv * 0.9
        const g = ctx.createLinearGradient(ax, 0, ax + aw, 0)
        g.addColorStop(0, 'rgba(239,236,230,0)')
        g.addColorStop(0.5, 'rgba(239,236,230,.85)')
        g.addColorStop(1, 'rgba(239,236,230,0)')
        ctx.strokeStyle = g
        ctx.lineWidth = DPR * 1.6
        ctx.beginPath(); ctx.moveTo(ax, lineY); ctx.lineTo(ax + aw, lineY); ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // Hash readout
    if (hashBoxRef.current) {
      hashBoxRef.current.style.opacity = String(Math.max(0, Math.min(1, (p - 0.70) / 0.06)))
    }
    if (hashRef.current && pHash > 0.01) {
      const reveal = Math.floor(pHash * HASH.length)
      let out = ''
      for (let i = 0; i < HASH.length; i++) {
        out += i < reveal ? HASH[i] : HEX[(Math.random() * 16) | 0]
      }
      hashRef.current.textContent = out
    }

    // Text beats
    const bands = [[-1, 0.30], [0.30, 0.55], [0.55, 0.74], [0.74, 2]]
    beatRefs.current.forEach((el, i) => {
      if (!el) return
      const [s, e] = bands[i]
      const o = Math.max(0, Math.min(1, Math.min((p - s) / 0.04, (e - p) / 0.04)))
      el.style.opacity = String(o)
      el.style.transform = `translateY(${(1 - o) * 16}px)`
    })
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Init points
    const pts: Pt[] = []
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        pts.push({
          u: (i + 0.5) / COLS,
          v: (j + 0.5) / ROWS,
          ox: Math.random() - 0.5,
          oy: Math.random() - 0.5,
          sp: Math.random() * 0.6 + 0.4,
          ph: Math.random() * Math.PI * 2,
        })
      }
    }
    ptsRef.current = pts

    const resize = () => {
      cv.width = Math.floor(cv.clientWidth * DPR)
      cv.height = Math.floor(cv.clientHeight * DPR)
    }
    resize()
    window.addEventListener('resize', resize)

    // Scroll-driven animation
    const section = cv.closest('.ak-sha') as HTMLElement
    if (!section) return

    let running = true
    const loop = (ts: number) => {
      if (!running) return
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const total = rect.height - vh
      const p = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : (rect.top <= 0 ? 1 : 0)
      draw(reduced ? 1 : p, ts)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [draw])

  return (
    <section className="ak-sha" id="ak-sha">
      <div className="ak-stage">
        <canvas ref={canvasRef} />
        <div className="ak-sha-ui">
          <div className="ak-sha-top">
            <p className="ak-kicker">
              <span className="ak-num">02</span> — Рождение подписи
            </p>
          </div>
          <div className="ak-sha-lower">
            <div ref={hashBoxRef} className="ak-sha-hash">
              <span className="ak-lbl">SHA-256 FINGERPRINT</span>
              <b ref={hashRef}>················································</b>
            </div>
            <div className="ak-sha-beats">
              {BEATS.map((beat, i) => (
                <div
                  key={i}
                  ref={(el) => { beatRefs.current[i] = el }}
                  className="ak-sha-beat"
                >
                  <h3>{beat.title}</h3>
                  <p>{beat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
