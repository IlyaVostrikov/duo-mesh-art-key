import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { FollowButton } from '@/components/FollowButton'
import { VerifiedBadge } from '@/components/ui/verified-badge'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'

interface HallHeroProps {
  title: string
  artist: { id: string; displayName: string; verified: boolean }
  description: string
  lang: 'ru' | 'en'
  onToggleLang: () => void
  featuredModel?: { modelUrl: string; posterUrl?: string; iosSrc?: string }
}

export function HallHero({ title, artist, description, lang, onToggleLang, featuredModel }: HallHeroProps) {
  const is3DFeatured = Boolean(featuredModel)

  return (
    <header className="grid items-center gap-12 pt-16 pb-20" style={{
      gridTemplateColumns: is3DFeatured ? '1fr 1fr' : '1fr',
    }}>
      {/* Text column */}
      <div>
        <RevealOnScroll direction="up">
          <h1 className="text-display-hero mb-6">{title}</h1>
        </RevealOnScroll>

        <RevealOnScroll direction="up" delay={80}>
          <p className="text-display-sm flex items-center gap-2.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
            {artist.displayName}
            {artist.verified && <VerifiedBadge size="md" />}
          </p>
        </RevealOnScroll>

        <RevealOnScroll direction="up" delay={100}>
          <div className="mb-6">
            <FollowButton artistId={artist.id} size="sm" />
          </div>
        </RevealOnScroll>

        <RevealOnScroll direction="up" delay={160}>
          <blockquote
            className="max-w-[540px] pl-4 mb-6 whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '1.15rem', lineHeight: 1.6, color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent)' }}
          >
            {description}
          </blockquote>
        </RevealOnScroll>

        <RevealOnScroll direction="up" delay={240}>
          <button
            onClick={onToggleLang}
            className="text-sm font-medium px-3 py-1 bg-surface border border-border rounded cursor-pointer transition"
            style={{ color: 'var(--text-secondary)' }}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </RevealOnScroll>
      </div>

      {/* 3D preview column */}
      {is3DFeatured && featuredModel && (
        <RevealOnScroll direction="up" delay={120}>
          <div
            data-lenis-prevent
            className="overflow-hidden"
            style={{ height: '500px', borderRadius: 'var(--radius)', boxShadow: 'var(--elev-2)' }}
          >
            <ModelViewer3D
              modelUrl={featuredModel.modelUrl}
              posterUrl={featuredModel.posterUrl}
              iosSrc={featuredModel.iosSrc}
            />
          </div>
        </RevealOnScroll>
      )}
    </header>
  )
}
