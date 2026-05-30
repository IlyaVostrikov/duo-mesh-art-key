import { Link } from '@tanstack/react-router'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface ValuePropProps { lang: 'ru' | 'en' }

const HEADLINE_RU = 'Каждая работа — с доказуемой подлинностью'
const HEADLINE_EN = 'Every artwork — with verifiable authenticity'

const PILLARS = [
  {
    titleRu: 'SHA-256 Provenance',
    titleEn: 'SHA-256 Provenance',
    descRu: 'Криптографический хеш фиксирует происхождение работы. Каждая передача владения записывается в цепочку, защищённую от подделки.',
    descEn: 'A cryptographic hash anchors the artworkʼs origin. Every ownership transfer is recorded in a tamper-evident chain.',
  },
  {
    titleRu: 'QR-верификация',
    titleEn: 'QR Verification',
    descRu: 'Отсканируйте ArtKey QR-код телефоном — и мгновенно проверьте подлинность и всю историю владения.',
    descEn: 'Scan the ArtKey QR code with your phone to instantly verify authenticity and the full ownership history.',
  },
  {
    titleRu: 'Под контролем художника',
    titleEn: 'Artist-Controlled',
    descRu: 'Художники выпускают ArtKey сами. Ни одна третья сторона не может изменить записи provenance.',
    descEn: 'Artists issue their own ArtKeys. No third party can alter provenance records.',
  },
]

export function LandingValueProp({ lang }: ValuePropProps) {
  return (
    <section className="border-y bg-surface/50">
      <div className="mx-auto w-full max-w-4xl space-y-14 px-5 py-20">
        {/* Headline */}
        <div className="text-center">
          <h2
            className="text-display-sm mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
          </h2>
          <Typography variant="body" tone="muted" className="mx-auto max-w-2xl" style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.1rem' }}>
            {lang === 'ru'
              ? 'ArtKey — это не блокчейн. Это криптографическая цепочка владения, которая не требует газа, кошельков или комиссий. Просто SHA-256 и математика.'
              : 'ArtKey is not a blockchain. Itʼs a cryptographic ownership chain that requires no gas, no wallets, no fees. Just SHA-256 and math.'}
          </Typography>
        </div>

        {/* QR demo */}
        <div className="flex flex-col items-center gap-3">
          <ArtKeyQR keyCode="DUO-2026-DEMO-KEY" size={140} />
          <Typography variant="caption" tone="muted">
            {lang === 'ru' ? 'Наведите камеру — или нажмите кнопку ниже' : 'Point your camera — or click below'}
          </Typography>
        </div>

        {/* Three pillars */}
        <div className="grid gap-8 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.titleEn} className="space-y-3 rounded-lg border bg-surface p-6">
              <Typography variant="h6" style={{ fontFamily: 'var(--font-display)' }}>
                {lang === 'ru' ? p.titleRu : p.titleEn}
              </Typography>
              <Typography variant="bodySm" tone="muted">
                {lang === 'ru' ? p.descRu : p.descEn}
              </Typography>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg">
            <Link to="/verify">
              {lang === 'ru' ? 'Попробовать верификацию' : 'Try Verification'}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
