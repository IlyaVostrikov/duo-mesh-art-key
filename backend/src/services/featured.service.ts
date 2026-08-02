import type { DbClient } from '../db'
import { FEATURED_CONFIG } from '@duo-mesh/contracts'
import { toArtworkPublicDto, type ArtworkPublicDto } from '../dto/artwork.dto'
import { toArtistPublicDto } from '../dto/artist.dto'
import crypto from 'node:crypto'

const { artworkArtist, artistHall } = FEATURED_CONFIG

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function makeDeterministicId(artistSlug: string, artworkSlug: string): string {
  const hash = sha256hex(`${artistSlug}/${artworkSlug}`)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-7${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}


export class FeaturedService {
  constructor(private prisma: DbClient) {}

  async getFeatured(): Promise<{
    hero: ArtworkPublicDto | null
    works: ArtworkPublicDto[]
    artists: ReturnType<typeof toArtistPublicDto>[]
    halls: Array<{ slug: string; title: string; coverImageUrl: string | null; viewCount: number; artworkCount: number; theme: string | null; artist: { id: string; displayName: string | null; avatarUrl: string | null } }>
  }> {
    const heroArtistSlug = artworkArtist[FEATURED_CONFIG.heroArtworkSlug]
    if (!heroArtistSlug) return { hero: null, works: [], artists: [], halls: [] }
    const heroId = makeDeterministicId(heroArtistSlug, FEATURED_CONFIG.heroArtworkSlug)

    const featuredIds = FEATURED_CONFIG.featuredArtworkSlugs
      .filter((slug) => artworkArtist[slug] !== undefined)
      .map((slug) => makeDeterministicId(artworkArtist[slug], slug))

    const featuredHallSlugs = FEATURED_CONFIG.featuredArtistSlugs.map(
      (slug) => artistHall[slug] ?? `${slug}-hall`,
    )

    const [hero, featuredArtworks, featuredArtists, halls] = await Promise.all([
      // Hero artwork — full detail with artist, artKey, provenance
      this.prisma.artwork.findUnique({
        where: { id: heroId },
        include: {
          artist: { include: { user: true, hall: true } },
          artKeys: true,
          provenanceRecords: { include: { toOwner: true }, orderBy: { sequence: 'asc' } },
        },
      }),

      // Featured artworks — lightweight list view
      this.prisma.artwork.findMany({
        where: { id: { in: featuredIds } },
        include: {
          artist: { include: { user: true, hall: true } },
          artKeys: true,
          provenanceRecords: { include: { toOwner: true }, orderBy: { sequence: 'asc' } },
        },
      }),

      // Featured artists — look up via hall slugs (deterministic from seed)
      this.prisma.artist.findMany({
        where: { hall: { slug: { in: featuredHallSlugs } } },
        include: {
          user: true,
          hall: true,
          _count: { select: { followers: true } },
        },
      }),

      // All published halls — artwork count comes through artist include
      this.prisma.exhibitionHall.findMany({
        where: { isPublished: true },
        include: {
          artist: { include: { user: true, _count: { select: { artworks: true } } } },
        },
      }),
    ])

    // Preserve config order (Prisma IN doesn't guarantee order)
    featuredArtworks.sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id))
    featuredArtists.sort((a, b) =>
      featuredHallSlugs.indexOf(a.hall?.slug ?? '') - featuredHallSlugs.indexOf(b.hall?.slug ?? ''),
    )

    return {
      hero: hero ? toArtworkPublicDto(hero) : null,
      works: featuredArtworks.map((aw) => toArtworkPublicDto(aw)),
      artists: featuredArtists.map((a) => toArtistPublicDto(a)),
      halls: halls.map((h) => ({
        slug: h.slug,
        title: h.title,
        coverImageUrl: h.coverImageUrl,
        viewCount: h.viewCount,
        artworkCount: h.artist._count?.artworks ?? 0,
        theme: h.theme,
        artist: { id: h.artist.id, displayName: h.artist.user.displayName, avatarUrl: h.artist.user.avatarUrl },
      })),
    }
  }
}
