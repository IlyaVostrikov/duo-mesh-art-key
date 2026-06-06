import { useEffect, useRef, useCallback, useState } from 'react'
import { VerifiedBadge } from '@/components/ui/verified-badge'
import { assetUrl } from '@/lib/asset-url'
import type { CeremonyData, CeremonyPhase } from './types'

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  color: string
  baseAlpha: number
  size: number
  vx: number
  vy: number
}

interface Props {
  data: CeremonyData
  onComplete: () => void
}

const MAX_DURATION_S = 8.0
const PARTICLE_GRID = 60 // 60x60 = up to 3600 particles from image
const ACCENT_RGB = '175, 180, 190' // silver-gray

export function PurchaseCeremony({ data, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef(0)
  const startRef = useRef(0)
  const phaseRef = useRef<CeremonyPhase>('APPEAR')
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)
  const [showBadge, setShowBadge] = useState(false)
  const [overlayAlpha, setOverlayAlpha] = useState(0)
  const [badgeScale, setBadgeScale] = useState(0)

  const skip = useCallback(() => {
    phaseRef.current = 'SETTLE'
    startRef.current = performance.now() - 6500
    setShowBadge(data.verified)
    setBadgeScale(1)
  }, [data.verified])

  // Load poster image
  useEffect(() => {
    if (!data.artworkPosterUrl) {
      imageLoadedRef.current = true
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      imageLoadedRef.current = true
    }
    img.onerror = () => { imageLoadedRef.current = true }
    img.src = assetUrl(data.artworkPosterUrl)
  }, [data.artworkPosterUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    resize()
    window.addEventListener('resize', resize)

    function computeGlyphMap(text: string, fontSize: number, maxWidth: number): { x: number; y: number }[] {
      const off = document.createElement('canvas')
      off.width = maxWidth
      off.height = fontSize * 3
      const octx = off.getContext('2d')!
      octx.font = `600 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.fillStyle = '#fff'
      octx.fillText(text, maxWidth / 2, (fontSize * 3) / 2)

      const imageData = octx.getImageData(0, 0, off.width, off.height)
      const points: { x: number; y: number }[] = []
      const step = 2 // denser sampling
      for (let py = 0; py < off.height; py += step) {
        for (let px = 0; px < off.width; px += step) {
          const alpha = imageData.data[(py * off.width + px) * 4 + 3]
          if (alpha > 60) {
            points.push({ x: px - maxWidth / 2, y: py - (fontSize * 3) / 2 })
          }
        }
      }
      return points
    }

    function sampleImageParticles(
      img: HTMLImageElement,
      displayW: number,
      displayH: number,
      displayX: number,
      displayY: number,
    ): Particle[] {
      const off = document.createElement('canvas')
      const scale = Math.min(1, PARTICLE_GRID / Math.max(img.width, img.height))
      off.width = Math.floor(img.width * scale)
      off.height = Math.floor(img.height * scale)
      const octx = off.getContext('2d')!
      octx.drawImage(img, 0, 0, off.width, off.height)

      const imageData = octx.getImageData(0, 0, off.width, off.height)
      const particles: Particle[] = []

      const imgScaleX = displayW / off.width
      const imgScaleY = displayH / off.height

      for (let py = 0; py < off.height; py++) {
        for (let px = 0; px < off.width; px++) {
          const i = (py * off.width + px) * 4
          const r = imageData.data[i]
          const g = imageData.data[i + 1]
          const b = imageData.data[i + 2]
          const a = imageData.data[i + 3]
          if (a < 20) continue

          // Desaturate toward gray during sampling
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          const gr = Math.round(lum * 0.7 + 175 * 0.3)
          const gg = Math.round(lum * 0.7 + 180 * 0.3)
          const gb = Math.round(lum * 0.7 + 190 * 0.3)

          particles.push({
            x: displayX + px * imgScaleX,
            y: displayY + py * imgScaleY,
            targetX: displayX + px * imgScaleX,
            targetY: displayY + py * imgScaleY,
            color: `rgba(${gr},${gg},${gb},0.85)`,
            baseAlpha: 0.85,
            size: 0.5 + Math.random() * 0.7,
            vx: 0,
            vy: 0,
          })
        }
      }
      return particles
    }

    function generateRandomParticles(count: number): Particle[] {
      return Array.from({ length: count }, () => ({
        x: w / 2 + (Math.random() - 0.5) * 10,
        y: h / 2 + (Math.random() - 0.5) * 10,
        targetX: w / 2 + (Math.random() - 0.5) * 10,
        targetY: h / 2 + (Math.random() - 0.5) * 10,
        color: `rgba(${ACCENT_RGB},0.6)`,
        baseAlpha: 0.6,
        size: 0.4 + Math.random() * 0.6,
        vx: 0,
        vy: 0,
      }))
    }

    let hashGlyphs: { x: number; y: number }[] | null = null
    let keyGlyphs: { x: number; y: number }[] | null = null
    let particlesInitialized = false

    const loop = (timestamp: number) => {
      if (startRef.current === 0) startRef.current = timestamp
      const elapsed = (timestamp - startRef.current) / 1000
      const phase = phaseRef.current

      if (elapsed >= MAX_DURATION_S && phase !== 'COMPLETE') {
        skip()
        return
      }

      let newPhase: CeremonyPhase = phase
      if (elapsed < 0.8) newPhase = 'APPEAR'
      else if (elapsed < 3.0) newPhase = 'DISSOLVE'
      else if (elapsed < 5.0) newPhase = 'REVEAL'
      else if (elapsed < 6.0) newPhase = 'SEAL'
      else if (elapsed < 7.0) newPhase = 'SETTLE'
      else newPhase = 'COMPLETE'

      if (newPhase !== phase) {
        phaseRef.current = newPhase
        if (newPhase === 'SEAL') {
          setShowBadge(data.verified)
          setBadgeScale(1)
        }
        if (newPhase === 'SETTLE') {
          setOverlayAlpha(0)
        }
        if (newPhase === 'COMPLETE') {
          onComplete()
          return
        }
      }

      if (newPhase === 'DISSOLVE' && !particlesInitialized) {
        const img = imageRef.current
        const imgW = Math.min(w * 0.5, 480)
        const imgH = imgW * (img ? img.height / img.width : 0.75)
        const imgX = (w - imgW) / 2
        const imgY = (h - imgH) / 2

        if (img && imageLoadedRef.current) {
          particlesRef.current = sampleImageParticles(img, imgW, imgH, imgX, imgY)
        } else {
          particlesRef.current = generateRandomParticles(3000)
        }
        particlesInitialized = true
      }

      if (newPhase === 'REVEAL' && !hashGlyphs) {
        const fontSize = Math.min(w * 0.05, 18)
        hashGlyphs = computeGlyphMap(
          data.integrityHash.slice(0, 8) + '...' + data.integrityHash.slice(-8),
          fontSize,
          Math.min(w * 0.9, 600),
        )
        const keyFontSize = Math.min(w * 0.07, 32)
        keyGlyphs = computeGlyphMap(data.keyCode, keyFontSize, Math.min(w * 0.9, 600))

        const particles = particlesRef.current
        const allGlyphPts = hashGlyphs.length > 0 ? hashGlyphs : keyGlyphs
        for (let i = 0; i < particles.length; i++) {
          if (i < allGlyphPts.length) {
            particles[i].targetX = w / 2 + allGlyphPts[i].x
            particles[i].targetY = h / 2 + allGlyphPts[i].y
            particles[i].color = `rgba(${ACCENT_RGB},0.8)`
          } else {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.max(w, h) * 0.3 + Math.random() * Math.max(w, h) * 0.4
            particles[i].targetX = w / 2 + Math.cos(angle) * dist
            particles[i].targetY = h / 2 + Math.sin(angle) * dist
            particles[i].color = `rgba(${ACCENT_RGB},0.25)`
          }
        }
      }

      if (newPhase === 'REVEAL' && elapsed >= 4.6 && keyGlyphs && keyGlyphs.length > 0) {
        const particles = particlesRef.current
        for (let i = 0; i < particles.length; i++) {
          if (i < keyGlyphs.length) {
            particles[i].targetX = w / 2 + keyGlyphs[i].x
            particles[i].targetY = h / 2 + keyGlyphs[i].y
            particles[i].color = `rgba(${ACCENT_RGB},0.9)`
          }
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, w, h)

      const bgAlpha = newPhase === 'SETTLE'
        ? Math.max(0, 0.85 * (1 - (elapsed - 6.0) / 1.0))
        : Math.min(0.85, elapsed / 0.4 * 0.85)
      setOverlayAlpha(bgAlpha)

      const particles = particlesRef.current
      if (particles.length === 0) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      // ── APPEAR / DISSOLVE: draw image ──
      if (newPhase === 'APPEAR' || newPhase === 'DISSOLVE') {
        const img = imageRef.current
        if (img && imageLoadedRef.current) {
          const imgW = Math.min(w * 0.5, 480)
          const imgH = imgW * (img.height / img.width)
          const imgX = (w - imgW) / 2
          const imgY = (h - imgH) / 2

          const imgAlpha = newPhase === 'APPEAR'
            ? Math.min(1, elapsed / 0.5)
            : Math.max(0, 1 - (elapsed - 0.8) / 2.2)

          if (imgAlpha > 0.01) {
            ctx.globalAlpha = imgAlpha
            // Soft gray spotlight
            const gradient = ctx.createRadialGradient(w / 2, h / 2, imgW * 0.1, w / 2, h / 2, imgW * 0.8)
            gradient.addColorStop(0, 'rgba(180,185,195,0.06)')
            gradient.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, w, h)

            ctx.drawImage(img, imgX, imgY, imgW, imgH)
            ctx.globalAlpha = 1
          }
        }
      }

      // ── Particle animation (water-like physics) ──
      for (const p of particles) {
        const dx = p.targetX - p.x
        const dy = p.targetY - p.y

        // Soft spring — gentle pull toward target
        p.vx += dx * 0.012
        p.vy += dy * 0.012

        // High damping — fluid, no oscillation
        p.vx *= 0.94
        p.vy *= 0.94

        // Gentle water-like undulation
        const waveX = Math.sin(p.y * 0.008 + elapsed * 0.7) * 0.12
        const waveY = Math.cos(p.x * 0.008 + elapsed * 0.7) * 0.12
        p.vx += waveX
        p.vy += waveY

        // Subtle drift during DISSOLVE
        if (newPhase === 'DISSOLVE') {
          p.vx += (Math.random() - 0.5) * 0.1
          p.vy += (Math.random() - 0.5) * 0.1
        }

        p.x += p.vx
        p.y += p.vy

        // Fade during SETTLE
        let alpha = p.baseAlpha
        if (newPhase === 'SETTLE') {
          alpha = Math.max(0, p.baseAlpha * (1 - (elapsed - 6.0) / 1.0))
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`)
        ctx.fill()
      }

      // ── SEAL phase: crisp text overlay ──
      if (newPhase === 'SEAL' || newPhase === 'SETTLE' || (newPhase === 'REVEAL' && elapsed >= 4.6)) {
        const textAlpha = newPhase === 'SETTLE'
          ? Math.max(0, 1 - (elapsed - 6.0) / 1.0)
          : Math.min(1, (elapsed - 4.6) / 0.4)

        ctx.fillStyle = `rgba(190,195,205,${textAlpha})`
        ctx.font = `600 ${Math.min(w * 0.07, 32)}px "JetBrains Mono", "Fira Code", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(data.keyCode, w / 2, h / 2)
      }

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [data, onComplete, skip])

  const bgOpacity = overlayAlpha || (phaseRef.current === 'SETTLE' ? 0 : 0.85)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99995,
        backgroundColor: `rgba(13,13,15,${bgOpacity})`,
        transition: 'background-color 0.5s ease',
        cursor: 'pointer',
      }}
      onClick={skip}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      <button
        onClick={(e) => { e.stopPropagation(); skip() }}
        style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99996,
          background: 'none', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.4)', padding: '6px 14px',
          borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)', cursor: 'pointer',
          opacity: phaseRef.current === 'SETTLE' ? 0 : 1,
          transition: 'opacity 0.3s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.75)' }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
      >
        Skip / Пропустить
      </button>

      {showBadge && data.verified && (
        <div
          style={{
            position: 'absolute', bottom: '15%', left: '50%',
            transform: `translate(-50%, 0) scale(${badgeScale})`,
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'center',
          }}
        >
          <VerifiedBadge />
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: '8px' }}>
            Криптографически подтверждено / Cryptographically Verified
          </p>
        </div>
      )}

      {showBadge && !data.verified && (
        <div
          style={{
            position: 'absolute', bottom: '15%', left: '50%',
            transform: 'translate(-50%, 0)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem' }}>
            Данные верификации недоступны / Verification data unavailable
          </p>
        </div>
      )}
    </div>
  )
}
