import { Link } from '@tanstack/react-router'
import { Typography } from '@/components/ui/typography'
import { parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface FeaturedHallsProps {
  halls: Array<{
    slug: string
    title: string
    coverImageUrl: string | null
    viewCount: number
    theme: string | null
    artist: { id: string; displayName: string }
  }>
  lang: 'ru' | 'en'
}

const HEADLINE_RU = 'Выставочные залы'
const HEADLINE_EN = 'Exhibition Halls'

export function LandingFeaturedHalls({ halls, lang }: FeaturedHallsProps) {
  if (halls.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-6xl space-y-10 px-5 py-16">
      <h2 className="text-display-sm" style={{ fontFamily: 'var(--font-display)' }}>
        {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
      </h2>

      <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'thin' }}>
        {halls.map((h) => {
          const [titleRu, titleEn] = parseBilingualTitle(h.title)
          const title = lang === 'ru' ? titleRu : titleEn

          return (
            <Link
              key={h.slug}
              to="/hall/$hallSlug"
              params={{ hallSlug: h.slug }}
              className="group flex w-[280px] shrink-0 flex-col gap-4 rounded-lg border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-lg"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Cover */}
              <div className="aspect-[4/3] overflow-hidden rounded-md bg-surface-2">
                {h.coverImageUrl ? (
                  <img
                    src={assetUrl(h.coverImageUrl)}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Typography variant="h4" tone="muted" style={{ fontFamily: 'var(--font-display)', opacity: 0.12 }}>
                      {title[0]}
                    </Typography>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <Typography variant="h6" className="truncate" style={{ fontFamily: 'var(--font-display)' }}>
                  {title}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {h.artist.displayName}
                </Typography>
                {h.theme && h.theme !== 'default' && (
                  <Typography variant="caption" tone="muted" className="block capitalize">
                    {h.theme}
                  </Typography>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
