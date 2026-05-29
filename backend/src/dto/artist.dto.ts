import type { Artist, User, ExhibitionHall } from '../generated/prisma/client'

type ArtistWithUser = Artist & { user: User; hall: ExhibitionHall | null }
type ArtistWithCounts = ArtistWithUser & { _count: { followers: number } }

export function toArtistDto(artist: Artist) {
  return {
    id: artist.id,
    userId: artist.userId,
    artistStatement: artist.artistStatement,
    websiteUrl: artist.websiteUrl,
    location: artist.location,
    verified: artist.verified,
    tier: artist.tier,
    totalSalesCount: artist.totalSalesCount,
    totalRevenue: artist.totalRevenue?.toString() ?? null,
    createdAt: artist.createdAt.toISOString(),
    updatedAt: artist.updatedAt.toISOString(),
  }
}

export function toArtistPublicDto(artist: ArtistWithCounts, isFollowed = false) {
  return {
    ...toArtistDto(artist),
    displayName: artist.user.displayName,
    avatarUrl: artist.user.avatarUrl,
    bio: artist.user.bio,
    socialLinks: artist.user.socialLinks as unknown,
    hall: artist.hall
      ? {
          slug: artist.hall.slug,
          title: artist.hall.title,
          coverImageUrl: artist.hall.coverImageUrl,
          isPublished: artist.hall.isPublished,
        }
      : null,
    followersCount: artist._count.followers,
    isFollowed,
  }
}
