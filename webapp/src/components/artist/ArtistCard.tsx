import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { UserAvatar } from '@/components/ui/user-avatar'
import { FollowButton } from '@/components/FollowButton'
import { parseBilingual, parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface ArtistCardProps {
  id: string
  displayName: string | null
  location: string | null
  verified: boolean
  artistStatement: string | null
  avatarUrl: string | null
  followersCount: number
  isFollowed?: boolean
  hall: { slug: string; title: string; coverImageUrl: string | null; isPublished: boolean } | null
  lang: 'ru' | 'en'
}

export function ArtistCard({
  id,
  displayName,
  location,
  verified,
  artistStatement,
  followersCount,
  isFollowed,
  hall,
  lang,
}: ArtistCardProps) {
  const [statementRu, statementEn] = parseBilingual(artistStatement)
  const [hallTitleRu, hallTitleEn] = parseBilingualTitle(hall?.title ?? null)
  const name = displayName ?? '—'
  const statement = lang === 'ru' ? statementRu : statementEn
  const hallTitle = lang === 'ru' ? hallTitleRu : hallTitleEn
  const hasHall = hall?.isPublished && hall.slug

  const content = (
    <>
      {/* Cover */}
      <div className="aspect-[3/1] overflow-hidden rounded-md bg-surface-2">
        {hall?.coverImageUrl ? (
          <img
            src={assetUrl(hall.coverImageUrl)}
            alt={hallTitle}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UserAvatar userId={id} displayName={name} size={64} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="h5" className="truncate font-display">
            {name}
          </Typography>
          {location && (
            <Typography variant="caption" tone="muted">
              {location}
            </Typography>
          )}
          {hallTitle && (
            <Typography variant="caption" tone="muted" className="block">
              {hallTitle}
            </Typography>
          )}
        </div>
        {verified && (
          <Badge variant="outline" className="shrink-0 border-accent/30 text-accent">
            Verified
          </Badge>
        )}
      </div>

      {statement && (
        <Typography variant="bodySm" tone="muted" className="line-clamp-3">
          "{statement.slice(0, 200)}{statement.length > 200 ? '...' : ''}"
        </Typography>
      )}

      {/* Follow + count */}
      <div className="flex items-center gap-2 mt-auto">
        <FollowButton
          artistId={id}
          initialIsFollowing={isFollowed ?? false}
          initialCount={followersCount}
          size="sm"
        />
      </div>
    </>
  )

  const cardClasses =
    'group flex flex-col gap-4 rounded-lg border bg-surface p-6 transition-all hover:border-accent/40 hover:shadow-lg'

  if (hasHall) {
    return (
      <Link
        to="/hall/$hallSlug"
        params={{ hallSlug: hall!.slug }}
        className={cardClasses}
        style={{ textDecoration: 'none' }}
      >
        {content}
      </Link>
    )
  }

  return <div className={cardClasses}>{content}</div>
}
