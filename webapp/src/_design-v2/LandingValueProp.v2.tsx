/*
  DESIGN V2 — LandingValueProp
  Заменяет: src/pages/landing/LandingValueProp.tsx

  Изменения:
  - Заголовок: Figtree (большой гротеск)
  - Три колонки → таблица-манифест с нумерацией 01/02/03
  - Hover на карточках: убран glow-overlay, только accent border
  - Статистика: крупные цифры Figtree, column-layout
  - QR-код убран с лендинга (он для страницы /verify)
  - Только русский язык
*/
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'

const PILLARS = [
  {
    index: '01',
    title: 'SHA-256 Provenance',
    desc: 'Криптографический хеш фиксирует происхождение работы. Каждая передача владения записывается в цепочку, защищённую от подделки.',
  },
  {
    index: '02',
    title: 'QR-верификация',
    desc: 'Отсканируйте ArtKey QR-код телефоном — и мгновенно проверьте подлинность и всю историю владения.',
  },
  {
    index: '03',
    title: 'Под контролем художника',
    desc: 'Художники выпускают ArtKey сами. Ни одна третья сторона не может изменить записи provenance.',
  },
]

export function LandingValueProp({ lang: _ }: { lang: 'ru' | 'en' }) {
  return (
    <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>

        {/* Заголовок + подпись */}
        <RevealOnScroll direction="up">
          <div
            style={{
              padding: '80px 0 60px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '64px',
              alignItems: 'end',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-display"
              style={{ fontFamily: 'var(--font-display)', margin: 0 }}
            >
              Каждая работа —<br />
              <span style={{ color: 'var(--text-secondary)' }}>с доказуемой</span><br />
              подлинностью
            </h2>
            <div>
              <Typography
                variant="body"
                tone="muted"
                style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.15rem', lineHeight: 1.65 }}
              >
                ArtKey — это не блокчейн. Криптографическая цепочка владения без газа, кошельков и комиссий. Только SHA-256 и математика.
              </Typography>
              <div style={{ marginTop: '28px' }}>
                <Button asChild size="lg">
                  <Link to="/verify">Попробовать верификацию</Link>
                </Button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Таблица принципов */}
        <RevealOnScroll direction="up">
          <div>
            {PILLARS.map((p, i) => (
              <div
                key={p.index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 2fr',
                  gap: '0 48px',
                  padding: '28px 0',
                  borderBottom: i < PILLARS.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'start',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-brand)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    color: 'var(--accent)',
                    paddingTop: '3px',
                  }}
                >
                  {p.index}
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: 'var(--text)',
                    margin: 0,
                    paddingTop: '2px',
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Статистика */}
        <RevealOnScroll direction="up">
          <div
            style={{
              padding: '56px 0 72px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}
          >
            {[
              { value: 29,   suffix: '',  label: 'Работ в галерее' },
              { value: 12,   suffix: '+', label: 'Художников' },
              { value: 3402, suffix: '',  label: 'Верификаций' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '0 0 0 32px',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  paddingLeft: i === 0 ? '0' : '32px',
                }}
              >
                <div
                  className="text-display"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
                >
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    margin: '10px 0 0',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </RevealOnScroll>

      </div>
    </section>
  )
}
