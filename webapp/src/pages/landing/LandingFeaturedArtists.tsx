import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { parseBilingual } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface FeaturedArtistsProps {
  artists: Array<{
    id: string
    displayName: string
    location: string | null
    verified: boolean
    artistStatement: string | null
    avatarUrl: string | null
    hall: { slug: string; title: string; coverImageUrl: string | null } | null
  }>
  lang: 'ru' | 'en'
}

const HEADLINE_RU = 'Художники'
const HEADLINE_EN = 'Artists'

export function LandingFeaturedArtists({ artists, lang }: FeaturedArtistsProps) {
  if (artists.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-6xl space-y-10 px-5 py-16">
      <h2 className="text-display-sm" style={{ fontFamily: 'var(--font-display)' }}>
        {lang === 'ru' ? HEADLINE_RU : HEADLINE_EN}
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {artists.map((a) => {
          const [statementRu, statementEn] = parseBilingual(a.artistStatement)
          const [hallTitleRu, hallTitleEn] = a.hall
            ? [a.hall.title.split(' / ')[0] ?? a.hall.title, a.hall.title.split(' / ')[1] ?? a.hall.title]
            : ['', '']
          const statement = lang === 'ru' ? statementRu : statementEn
          const hallTitle = lang === 'ru' ? hallTitleRu : hallTitleEn

          return (
            <Link
              key={a.id}
              to="/hall/$hallSlug"
              params={{ hallSlug: a.hall?.slug ?? '' }}
              className="group flex flex-col gap-4 rounded-lg border bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-lg"
            >
              {/* Cover image */}
              {a.hall?.coverImageUrl ? (
                <div className="aspect-[3/1] overflow-hidden rounded-md bg-surface-2">
                  <img
                    src={assetUrl(a.hall.coverImageUrl)}
                    alt={hallTitle}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/1] items-center justify-center rounded-md bg-surface-2">
                  <Typography variant="display-sm" tone="muted" style={{ fontFamily: 'var(--font-display)', opacity: 0.15 }}>
                    {a.displayName[0]}
                  </Typography>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Typography variant="h5" className="truncate" style={{ fontFamily: 'var(--font-display)' }}>
                    {a.displayName}
                  </Typography>
                  {a.location && (
                    <Typography variant="caption" tone="muted">
                      {a.location}
                    </Typography>
                  )}
                  {hallTitle && (
                    <Typography variant="caption" tone="muted" className="block">
                      {hallTitle}
                    </Typography>
                  )}
                </div>
                {a.verified && <Badge variant="outline" className="shrink-0 border-accent/30 text-accent">Verified</Badge>}
              </div>

              {statement && (
                <Typography
                  variant="bodySm"
                  tone="muted"
                  className="line-clamp-3 italic"
                  style={{ fontFamily: 'var(--font-editorial)' }}
                >
                  "{statement.slice(0, 200)}{statement.length > 200 ? '...' : ''}"
                </Typography>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
