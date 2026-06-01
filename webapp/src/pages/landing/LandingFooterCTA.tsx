import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { Typography } from '@/components/ui/typography'
import { FooterBar } from '@/components/ui/footer-bar'

export function LandingFooterCTA({ lang: _ }: { lang: 'ru' | 'en'; onToggleLang: () => void }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>

        {/* CTA block */}
        <div
          className="grid grid-cols-2 items-center gap-16 border-b border-border"
          style={{ padding: '96px 0 80px' }}
        >
          <RevealOnScroll direction="up">
            <h2 className="text-display-sm m-0 text-foreground">
              Присоединяйтесь
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>к DUO MESH</span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll direction="up" delay={80}>
            <div className="flex flex-col gap-4" style={{ maxWidth: '320px' }}>
              <Typography variant="body" font="sans" tone="muted">
                Создавайте 3D-галереи, выпускайте ArtKey-сертификаты
                и участвуйте в экосистеме верифицированного цифрового искусства.
              </Typography>
              <div className="flex flex-wrap gap-3 mt-2">
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

        <FooterBar
          copyright="DUO MESH © 2026"
          tagline="Платформа верифицированного цифрового искусства"
        />
      </div>
    </footer>
  )
}
