import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { assetUrl } from '@/lib/asset-url'
import { parseBilingualTitle } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'

interface HallCardProps {
  slug: string
  title: string
  coverImageUrl: string | null
  viewCount: number
  artworkCount: number
  theme: string | null
  artist: { id: string; displayName: string; avatarUrl: string | null }
  lang: 'ru' | 'en'
}

const themeBadgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[0.65rem] font-semibold uppercase tracking-widest',
  {
    variants: {
      theme: {
        default: 'text-[var(--text-muted)]',
        dark: 'text-white',
        light: 'text-gray-800',
        warm: 'text-amber-700',
        cool: 'text-blue-700',
      } as Record<string, string>,
    },
    defaultVariants: { theme: 'default' },
  },
)

function themeDot(theme: string | null): string {
  const map: Record<string, string> = {
    default: 'var(--text-muted)',
    dark: '#1a1a1a',
    light: '#f5f5f0',
    warm: '#d4a574',
    cool: '#8ab4d8',
  }
  return map[theme ?? 'default'] ?? map.default
}

export function HallCard({ slug, title, coverImageUrl, viewCount, artworkCount, theme, artist, lang }: HallCardProps) {
  const [titleRu] = parseBilingualTitle(title)
  const resolvedTheme = theme ?? 'default'

  return (
    <Link
      to="/hall/$hallSlug"
      params={{ hallSlug: slug }}
      className="group flex flex-col gap-4 rounded-lg border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-lg cursor-pointer"
      style={{ textDecoration: 'none' }}
    >
      {/* Cover */}
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-surface-2 relative">
        {coverImageUrl ? (
          <img
            src={assetUrl(coverImageUrl)}
            alt={titleRu}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-6xl font-display font-bold opacity-10 select-none">
              {titleRu[0]}
            </span>
          </div>
        )}

        {/* Theme badge — top-left */}
        <span
          className={themeBadgeVariants({ theme: resolvedTheme as any })}
          style={{ position: 'absolute', top: 8, left: 8, backgroundColor: `${themeDot(resolvedTheme)}22`, backdropFilter: 'blur(4px)' }}
        >
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: themeDot(resolvedTheme) }} />
          {resolvedTheme}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-base font-semibold leading-snug truncate group-hover:text-accent transition-colors">
          {titleRu}
        </h3>

        {/* Artist row */}
        <div className="flex items-center gap-2">
          {artist.avatarUrl ? (
            <img
              src={artist.avatarUrl}
              alt={artist.displayName}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <UserAvatar userId={artist.id} displayName={artist.displayName} size={20} />
          )}
          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {artist.displayName}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
            {artworkCount} {lang === 'ru' ? 'работ' : 'works'}
          </span>
          <span className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
            {viewCount.toLocaleString()} {lang === 'ru' ? 'просм.' : 'views'}
          </span>
        </div>
      </div>
    </Link>
  )
}
