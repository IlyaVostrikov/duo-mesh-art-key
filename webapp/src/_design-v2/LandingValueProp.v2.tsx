/*
  DESIGN V2 — LandingValueProp
  Заменяет: src/pages/landing/LandingValueProp.tsx

  Изменения:
  - Только русский язык
  - Уровень "три колонки" заменён на горизонтальную таблицу-манифест
  - Убраны hover-glow на карточках — чистая рамка
  - Статистика подана как типографическое произведение, не как виджет
  - Убран QR-код с лендинга (он про верификацию, не про ценность)
  - RevealOnScroll оставлен, но без delay-каскада (единовременно)
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

        {/* Заголовок секции */}
        <RevealOnScroll direction="up">
          <div
            style={{
              padding: '80px 0 64px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '48px',
              alignItems: 'end',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 className="text-editorial" style={{ margin: 0, color: 'var(--text)' }}>
              Каждая работа —<br />
              <span style={{ color: 'var(--text-secondary)' }}>с доказуемой</span><br />
              подлинностью
            </h2>
            <div>
              <Typography
                variant="body"
                tone="muted"
                style={{
                  fontFamily: 'var(--font-editorial)',
                  fontSize: '1.15rem',
                  lineHeight: 1.65,
                  maxWidth: '420px',
                }}
              >
                ArtKey — это не блокчейн. Это криптографическая
                цепочка владения, которая не требует газа, кошельков
                или комиссий. Только SHA-256 и математика.
              </Typography>
              <div style={{ marginTop: '32px' }}>
                <Button asChild size="lg">
                  <Link to="/verify">Попробовать верификацию</Link>
                </Button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Три принципа — таблица */}
        <RevealOnScroll direction="up">
          <div>
            {PILLARS.map((p, i) => (
              <div
                key={p.index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 2fr',
                  gap: '0 48px',
                  padding: '32px 0',
                  borderBottom: i < PILLARS.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'start',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.12em',
                    color: 'var(--text-muted)',
                    paddingTop: '4px',
                  }}
                >
                  {p.index}
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9rem',
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
                    lineHeight: 1.6,
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

        {/* Статистика — типографическое высказывание */}
        <RevealOnScroll direction="up">
          <div
            style={{
              padding: '64px 0 80px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0',
            }}
          >
            {[
              { value: 29, suffix: '', label: 'Работ в галерее' },
              { value: 12, suffix: '+', label: 'Художников' },
              { value: 3402, suffix: '', label: 'Верификаций' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '0 32px',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '3.5rem',
                    lineHeight: 1,
                    color: 'var(--text)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    margin: '12px 0 0',
                    textTransform: 'uppercase',
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
