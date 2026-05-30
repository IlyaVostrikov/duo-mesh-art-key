import type { DbClient } from '../db'
import { FEATURED_CONFIG } from '@duo-mesh/contracts'
import { toArtworkPublicDto } from '../dto/artwork.dto'
import { toArtistPublicDto } from '../dto/artist.dto'
import crypto from 'node:crypto'

// Artwork slug → artist slug mapping (mirrors seed data structure)
const ARTWORK_ARTIST: Record<string, string> = {
  'cosmic-drift': 'elena-volkova', 'silent-shores': 'elena-volkova',
  'crimson-pulse': 'elena-volkova', 'golden-thread': 'elena-volkova',
  'storm-front': 'elena-volkova', 'embers-of-form': 'elena-volkova',
  'neon-nocturne': 'maxim-drozdov', 'data-ghosts': 'maxim-drozdov',
  'anatomie-du-reve': 'maxim-drozdov', 'synthetic-garden': 'maxim-drozdov',
  'threshold': 'maxim-drozdov',
  'staircase-iii': 'anna-sokolova', 'winter-palace': 'anna-sokolova',
  'found-silence': 'anna-sokolova', 'metro-diptych': 'anna-sokolova',
  'afterimage': 'anna-sokolova',
  'letters-never-sent': 'daria-lys', 'map-of-departures': 'daria-lys',
  'archive-of-rain': 'daria-lys', 'fragments-of-light': 'daria-lys',
  'bronze-echo': 'viktor-iron', 'scanned-figure': 'viktor-iron',
  'digital-double': 'viktor-iron', 'frozen-gesture': 'viktor-iron',
  'lucid-dream': 'kira-nova', 'hybrid-flora': 'kira-nova',
  'portal-v2': 'kira-nova', 'glitch-portrait': 'kira-nova',
  'mesh-poem': 'kira-nova',
}

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function makeDeterministicId(artistSlug: string, artworkSlug: string): string {
  const hash = sha256hex(`${artistSlug}/${artworkSlug}`)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-7${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}


export class FeaturedService {
  constructor(private prisma: DbClient) {}

  async getFeatured() {
    const heroArtistSlug = ARTWORK_ARTIST[FEATURED_CONFIG.heroArtworkSlug]
    const heroId = makeDeterministicId(heroArtistSlug, FEATURED_CONFIG.heroArtworkSlug)

    const featuredIds = FEATURED_CONFIG.featuredArtworkSlugs.map((slug) =>
      makeDeterministicId(ARTWORK_ARTIST[slug], slug),
    )

    const featuredHallSlugs = FEATURED_CONFIG.featuredArtistSlugs.map((slug) => {
      // Map artist slugs → hall slugs (from seed: elena-volkova → volkova-gallery, etc.)
      const hallMap: Record<string, string> = {
        'elena-volkova': 'volkova-gallery', 'maxim-drozdov': 'drozdov-lab',
        'anna-sokolova': 'sokolova-chamber', 'daria-lys': 'lys-atelier',
        'viktor-iron': 'iron-forge', 'kira-nova': 'nova-nexus',
      }
      return hallMap[slug] ?? `${slug}-hall`
    })

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

      // All published halls
      this.prisma.exhibitionHall.findMany({
        where: { isPublished: true },
        include: { artist: { include: { user: true } } },
      }),
    ])

    // Preserve config order (Prisma IN doesn't guarantee order)
    featuredArtworks.sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id))
    featuredArtists.sort((a, b) =>
      featuredHallSlugs.indexOf(a.hall?.slug ?? '') - featuredHallSlugs.indexOf(b.hall?.slug ?? ''),
    )

    return {
      hero: hero ? toArtworkPublicDto(hero as any) : null,
      works: featuredArtworks.map((aw) => toArtworkPublicDto(aw as any)),
      artists: featuredArtists.map((a) => toArtistPublicDto(a as any)),
      halls: halls.map((h) => ({
        slug: h.slug,
        title: h.title,
        coverImageUrl: h.coverImageUrl,
        viewCount: h.viewCount,
        theme: h.theme,
        artist: { id: h.artist.id, displayName: h.artist.user.displayName },
      })),
    }
  }
}
