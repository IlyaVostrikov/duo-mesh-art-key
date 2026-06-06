import { useCallback, useRef, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ParticleField } from '@/components/motion/ParticleField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { LabelBar } from '@/components/ui/label-bar'
import { parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface HeroProps {
  heroWork: {
    id: string
    title: string
    artist: { displayName: string; hallSlug: string | null }
    posterUrl: string
    modelUrl: string | null
    mediaType: 'IMAGE_2D' | 'MODEL_3D'
    medium: string | null
  } | null
  lang: 'ru' | 'en'
}

const MISSION_RU = 'Каждая работа заслуживает доказуемой подлинности.'
const SUB_RU = 'ArtKey — не блокчейн. Криптографическая provenance-система, которая даёт каждому произведению неподделываемую историю.'

const FP = 'a3f9c27e'
const HEX = '0123456789abcdef'

export function LandingHero({ heroWork, lang: _lang }: HeroProps) {
  const [artworkRu] = heroWork ? parseBilingualTitle(heroWork.title) : ['']
  const spotlightRef = useRef<HTMLDivElement>(null)
  const fpRef = useRef<HTMLElement>(null)

  // Live fingerprint scramble
  useEffect(() => {
    const fpEl = fpRef.current
    if (!fpEl) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { fpEl.textContent = FP; return }

    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        const i = (Math.random() * FP.length) | 0
        fpEl.textContent = FP.slice(0, i) + HEX[(Math.random() * 16) | 0] + FP.slice(i + 1)
        setTimeout(() => { fpEl.textContent = FP }, 90)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = spotlightRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    requestAnimationFrame(() => {
      el.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(198,255,58,0.025), transparent 65%)`
      el.style.opacity = '1'
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = spotlightRef.current
    if (el) el.style.opacity = '0'
  }, [])

  return (
    <section
      className="ak-hero"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <ParticleField particleCount={22} connectionDistance={120} />

      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 z-0"
        style={{ opacity: 0, transition: 'opacity 0.5s ease' }}
      />

      <div className="ak-hero-stage">
        {/* Mono kicker */}
        <p className="ak-kicker ak-hero-kicker">
          Цифровая галерея&nbsp;·&nbsp;DUO MESH
        </p>

        {/* Artwork with frame corners */}
        {heroWork ? (
          <div
            className="ak-artframe"
            style={{
              width: 'clamp(260px, 30vw, 380px)',
              height: 'clamp(340px, 40vw, 500px)',
            }}
          >
            {heroWork.mediaType === 'MODEL_3D' && heroWork.modelUrl ? (
              <ModelViewer3D
                modelUrl={heroWork.modelUrl}
                posterUrl={assetUrl(heroWork.posterUrl)}
                iosSrc={heroWork.modelUrl.replace(/\.(glb|gltf)$/i, '.usdz')}
              />
            ) : (
              <img
                src={assetUrl(heroWork.posterUrl)}
                alt={artworkRu}
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'var(--ak-noir)' }}
              />
            )}
            <span className="ak-frame-corner ak-tl" />
            <span className="ak-frame-corner ak-tr" />
            <span className="ak-frame-corner ak-bl" />
            <span className="ak-frame-corner ak-br" />
          </div>
        ) : (
          <div
            style={{
              width: 'clamp(260px, 30vw, 380px)',
              height: 'clamp(340px, 40vw, 500px)',
              background: 'var(--ak-noir)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Typography tone="muted">Загрузка...</Typography>
          </div>
        )}

        {/* Provenance plate */}
        {heroWork && (
          <div className="ak-hero-plate">
            <span className="ak-hp-dot" />
            <span className="ak-hp-name">{artworkRu || heroWork.title} · 2026</span>
            <span className="ak-hp-sep">·</span>
            <span className="ak-hp-fp">
              ArtKey №0001 · <b ref={fpRef}>{FP}</b>
            </span>
          </div>
        )}

        {/* Manifesto headline */}
        <h1 className="ak-hero-head">
          {MISSION_RU}
        </h1>
        <p className="ak-hero-sub body">
          <b>ArtKey</b> — не блокчейн. Криптографическая provenance-система,
          которая даёт каждому произведению неподделываемую историю.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3" style={{ fontFamily: 'var(--ak-font)' }}>
          <Button asChild size="lg">
            <Link to="/gallery">Смотреть галерею</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/verify">Проверить сертификат</Link>
          </Button>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="ak-scrollcue">
        <span>Пройдите путь работы</span>
        <span className="ak-rail" />
      </div>
    </section>
  )
}
