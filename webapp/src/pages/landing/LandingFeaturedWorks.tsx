import { Link } from '@tanstack/react-router'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { Typography } from '@/components/ui/typography'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import Container from '@/components/layout/Container'
import Section from '@/components/layout/Section'
import Stack from '@/components/layout/Stack'

interface FeaturedWorksProps {
  works: Array<{
    id: string
    title: string
    artist: { displayName: string; hallSlug: string | null }
    posterUrl: string
    mediaType: 'IMAGE_2D' | 'MODEL_3D'
    price: string | null
    currency: string
    status: string
  }>
  lang: 'ru' | 'en'
}

const HEADLINE_RU = 'Избранные работы'
const HEADLINE_EN = 'Featured Works'

export function LandingFeaturedWorks({ works, lang }: FeaturedWorksProps) {
  if (works.length === 0) {
    return (
      <Section>
        <Container>
          <Typography tone="muted">{lang === 'ru' ? 'Работы скоро появятся' : 'Works coming soon'}</Typography>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container>
        <Stack gap="md">
          <div className="flex items-end justify-between">
            <h2 className="text-display-sm">
              {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
            </h2>
            <Typography asChild variant="control" tone="muted">
              <Link to="/gallery" className="hover:text-accent">
                {lang === 'ru' ? 'Вся галерея →' : 'Full gallery →'}
              </Link>
            </Typography>
          </div>

          {/* Editorial grid — asymmetric 12-col spans */}
          <div className="grid grid-cols-12 gap-5">
        {works.map((w, i) => {
          // Row 1: 8+4, Row 2: 5+7, Row 3: 4+4+4, Row 4: 6 centered
          const spans = [
            'col-span-12 md:col-span-8',
            'col-span-12 md:col-span-4',
            'col-span-12 md:col-span-5',
            'col-span-12 md:col-span-7',
            'col-span-12 md:col-span-4',
            'col-span-12 md:col-span-4',
            'col-span-12 md:col-span-4',
            'col-span-12 md:col-span-6 md:col-start-4',
          ]
          return (
            <RevealOnScroll key={w.id} direction="up" delay={i * 80}>
              <div className={spans[i] ?? 'col-span-12 md:col-span-4'}>
                <ArtworkCard
                id={w.id}
                title={w.title}
                artistName={w.artist.displayName}
                posterUrl={w.posterUrl}
                mediaType={w.mediaType}
                price={w.price}
                currency={w.currency}
                status={w.status}
                aspectRatio={i === 0 ? 'auto' : '4:5'}
              />
              </div>
            </RevealOnScroll>
          )
        })}
      </div>
        </Stack>
      </Container>
    </Section>
  )
}
