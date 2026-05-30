/*
  DESIGN V2 — LandingFooterCTA
  Заменяет: src/pages/landing/LandingFooterCTA.tsx

  Изменения:
  - Убран переключатель языка (язык — настройка, не footer)
  - Editorial-заголовок вместо Unbounded
  - Две кнопки CTA с чёткой иерархией: primary + ghost
  - Футер-подпись: минималистичная строка
*/
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { Typography } from '@/components/ui/typography'

export function LandingFooterCTA({ lang: _ }: { lang: 'ru' | 'en'; onToggleLang: () => void }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>

        {/* CTA блок */}
        <div
          style={{
            padding: '96px 0 80px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '64px',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <RevealOnScroll direction="up">
            <h2 className="text-editorial" style={{ margin: 0, color: 'var(--text)' }}>
              Присоединяйтесь
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>к DUO MESH</span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll direction="up" delay={80}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px' }}>
              <p
                style={{
                  fontFamily: 'var(--font-editorial)',
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                Создавайте 3D-галереи, выпускайте ArtKey-сертификаты
                и участвуйте в экосистеме верифицированного цифрового искусства.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                <Button asChild size="lg">
                  <Link to="/onboarding/artist">Для художников</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Войти</Link>
                </Button>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Нижняя строка */}
        <div
          style={{
            padding: '24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="caption"
            tone="muted"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            DUO MESH © 2026
          </Typography>
          <Typography
            variant="caption"
            tone="muted"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            Платформа верифицированного цифрового искусства
          </Typography>
        </div>

      </div>
    </footer>
  )
}
