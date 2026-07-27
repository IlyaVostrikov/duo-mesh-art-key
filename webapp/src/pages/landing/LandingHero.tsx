import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

const MISSION_RU = 'Каждая работа заслуживает доказуемой подлинности.'
const HERO_IMG = '/hero/final-2-flythrough.jpg'

export function LandingHero(_props?: { heroWork?: unknown; lang?: string }) {
  return (
    <section style={{
      height: '100svh',
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      overflow: 'hidden',
      background: '#0b0c10',
    }}>
      <img
        src={HERO_IMG}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Gradient overlay for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, transparent 40%, transparent 60%, rgba(0,0,0,.5) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Text overlay with glassmorphism */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        color: '#fff',
        padding: 'clamp(28px, 6vw, 88px)',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'inline-block',
          pointerEvents: 'auto',
          background: 'rgba(0, 0, 0, 0.22)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderRadius: 18,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: 'clamp(18px, 2.5vw, 30px) clamp(20px, 3vw, 34px)',
          maxWidth: '48ch',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
        }}>
          <p style={{
            fontFamily: 'var(--ak-mono)',
            fontSize: 'clamp(10px, 1vw, 12.5px)',
            letterSpacing: '.34em',
            textTransform: 'uppercase',
            opacity: .78,
            margin: '0 0 18px',
          }}>
            Цифровая галерея&nbsp;·&nbsp;DUO MESH
          </p>

          <h1 style={{
            fontFamily: 'var(--ak-font), Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(30px, 5vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-.01em',
            margin: 0,
            maxWidth: '16ch',
            textShadow: '0 2px 40px rgba(0,0,0,.35)',
          }}>
            {MISSION_RU}
          </h1>

          <p style={{
            fontFamily: 'var(--ak-font), system-ui, sans-serif',
            fontWeight: 400,
            fontSize: 'clamp(15px, 1.4vw, 19px)',
            lineHeight: 1.5,
            opacity: .85,
            margin: '20px 0 32px',
            maxWidth: '42ch',
          }}>
            <b>ArtKey</b> — не блокчейн. Криптографическая provenance-система,
            которая даёт каждому произведению неподделываемую историю.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Button asChild size="lg">
              <Link to="/gallery">Смотреть галерею</Link>
            </Button>
            <Button asChild variant="outline" size="lg" style={{
              borderColor: 'rgba(255,255,255,.45)',
              color: '#fff',
              backdropFilter: 'blur(6px)',
            } as React.CSSProperties}>
              <Link to="/verify">Проверить сертификат</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
