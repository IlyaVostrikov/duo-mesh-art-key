import { Link } from '@tanstack/react-router'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import Container from '@/components/layout/Container'
import Section from '@/components/layout/Section'
import Stack from '@/components/layout/Stack'

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
    <Section border="both" background="surface" paddingY="lg">
      <Container size="narrow">
        <Stack gap="lg">
        {/* Headline */}
        <div className="text-center">
          <h2
            className="text-display-sm mb-4"
          >
            {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
          </h2>
          <Typography variant="body" tone="muted" className="mx-auto max-w-2xl font-editorial" style={{ fontSize: '1.1rem' }}>
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
          {PILLARS.map((p, i) => (
            <RevealOnScroll key={p.titleEn} direction="up" delay={i * 120}>
              <div className="space-y-3 rounded-lg border bg-surface p-6 transition-all duration-500 hover:border-accent/20 hover:shadow-[0_0_30px_rgba(198,255,58,0.04)] hover:bg-surface-2">
                <Typography variant="h6" className="font-display">
                  {lang === 'ru' ? p.titleRu : p.titleEn}
                </Typography>
                <Typography variant="bodySm" tone="muted">
                  {lang === 'ru' ? p.descRu : p.descEn}
                </Typography>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-12 py-8 border-t border-b border-border/50">
          <div className="text-center">
            <div
              className="text-display-sm"
            >
              <AnimatedCounter value={29} />
            </div>
            <Typography variant="caption" tone="muted">
              {lang === 'ru' ? 'Работ' : 'Artworks'}
            </Typography>
          </div>
          <div className="text-center">
            <div
              className="text-display-sm"
            >
              <AnimatedCounter value={12} suffix="+" />
            </div>
            <Typography variant="caption" tone="muted">
              {lang === 'ru' ? 'Художников' : 'Artists'}
            </Typography>
          </div>
          <div className="text-center">
            <div
              className="text-display-sm"
            >
              <AnimatedCounter value={3402} />
            </div>
            <Typography variant="caption" tone="muted">
              {lang === 'ru' ? 'Верификаций' : 'Verifications'}
            </Typography>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg">
            <Link to="/verify">
              {lang === 'ru' ? 'Попробовать верификацию' : 'Try Verification'}
            </Link>
          </Button>
        </div>
        </Stack>
      </Container>
    </Section>
  )
}
