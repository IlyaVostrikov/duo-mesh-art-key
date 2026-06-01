import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { HallCard } from '@/components/hall/HallCard'
import Container from '@/components/layout/Container'
import Section from '@/components/layout/Section'
import Stack from '@/components/layout/Stack'

interface FeaturedHallsProps {
  halls: Array<{
    slug: string
    title: string
    coverImageUrl: string | null
    viewCount: number
    artworkCount: number
    theme: string | null
    artist: { id: string; displayName: string; avatarUrl: string | null }
  }>
  lang: 'ru' | 'en'
}

const HEADLINE_RU = 'Выставочные залы'
const HEADLINE_EN = 'Exhibition Halls'

export function LandingFeaturedHalls({ halls, lang }: FeaturedHallsProps) {
  if (halls.length === 0) return null

  return (
    <Section>
      <Container>
        <Stack gap="md">
          <RevealOnScroll direction="up">
            <h2 className="text-display-sm">
              {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
            </h2>
          </RevealOnScroll>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {halls.map((h, i) => (
              <RevealOnScroll key={h.slug} direction="up" delay={i * 80}>
                <HallCard
                  slug={h.slug}
                  title={h.title}
                  coverImageUrl={h.coverImageUrl}
                  viewCount={h.viewCount}
                  artworkCount={h.artworkCount}
                  theme={h.theme}
                  artist={h.artist}
                  lang={lang}
                />
              </RevealOnScroll>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
