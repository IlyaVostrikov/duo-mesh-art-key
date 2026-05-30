import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface FooterCTAProps {
  lang: 'ru' | 'en'
  onToggleLang: () => void
}

const HEADLINE_RU = 'Присоединяйтесь к DUO MESH'
const HEADLINE_EN = 'Join DUO MESH'
const ARTIST_RU = 'Для художников'
const ARTIST_EN = 'For Artists'
const COLLECTOR_RU = 'Для коллекционеров'
const COLLECTOR_EN = 'For Collectors'

export function LandingFooterCTA({ lang, onToggleLang }: FooterCTAProps) {
  return (
    <footer className="border-t bg-surface/50">
      <div className="mx-auto w-full max-w-4xl space-y-10 px-5 py-20 text-center">
        <h2
          className="text-display"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/onboarding/artist">
              {lang === 'ru' ? ARTIST_RU : ARTIST_EN}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/verify">
              {lang === 'ru' ? COLLECTOR_RU : COLLECTOR_EN}
            </Link>
          </Button>
        </div>

        {/* Language toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={lang === 'en' ? onToggleLang : undefined}
            className={`text-sm transition-colors ${lang === 'ru' ? 'text-text font-medium' : 'text-text-muted hover:text-text-secondary'}`}
          >
            RU
          </button>
          <span className="text-text-muted">|</span>
          <button
            onClick={lang === 'ru' ? onToggleLang : undefined}
            className={`text-sm transition-colors ${lang === 'en' ? 'text-text font-medium' : 'text-text-muted hover:text-text-secondary'}`}
          >
            EN
          </button>
        </div>

        <Typography variant="caption" tone="muted">
          DUO MESH 2026 · {lang === 'ru' ? 'Платформа верифицированного цифрового искусства' : 'Verified digital art platform'}
        </Typography>
      </div>
    </footer>
  )
}
