import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { PrincipleRow } from '@/components/ui/principle-row'
import { StatCard } from '@/components/ui/stat-card'

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

const STATS = [
  { value: 29,   suffix: '',  label: 'Работ в галерее' },
  { value: 12,   suffix: '+', label: 'Художников' },
  { value: 3402, suffix: '',  label: 'Верификаций' },
]

export function LandingValueProp({ lang: _ }: { lang: 'ru' | 'en' }) {
  return (
    <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>

        {/* Headline + sub */}
        <RevealOnScroll direction="up">
          <div
            className="grid grid-cols-2 items-end gap-16 border-b border-border"
            style={{ padding: '80px 0 60px' }}
          >
            <h2 className="text-display m-0" style={{ fontFamily: 'var(--font-display)' }}>
              Каждая работа —<br />
              <span style={{ color: 'var(--text-secondary)' }}>с доказуемой</span><br />
              подлинностью
            </h2>
            <div>
              <Typography variant="body" font="editorial" tone="muted">
                ArtKey — это не блокчейн. Криптографическая цепочка владения без газа, кошельков и комиссий. Только SHA-256 и математика.
              </Typography>
              <div className="mt-7">
                <Button asChild size="lg">
                  <Link to="/verify">Попробовать верификацию</Link>
                </Button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Principles table */}
        <RevealOnScroll direction="up">
          <div>
            {PILLARS.map((p, i) => (
              <PrincipleRow
                key={p.index}
                index={p.index}
                title={p.title}
                description={p.desc}
                isLast={i === PILLARS.length - 1}
              />
            ))}
          </div>
        </RevealOnScroll>

        {/* Statistics */}
        <RevealOnScroll direction="up">
          <div
            className="grid grid-cols-3"
            style={{ padding: '56px 0 72px' }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  paddingLeft: i === 0 ? '0' : '32px',
                }}
              >
                <StatCard value={stat.value} suffix={stat.suffix} label={stat.label} />
              </div>
            ))}
          </div>
        </RevealOnScroll>

      </div>
    </section>
  )
}
