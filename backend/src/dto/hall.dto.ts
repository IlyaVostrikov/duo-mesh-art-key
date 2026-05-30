import type { ExhibitionHall, Artist, User, Artwork } from '../generated/prisma/client'

type HallWithArtist = ExhibitionHall & {
  artist: Artist & { user: User }
}
type HallWithArtworks = HallWithArtist & {
  artworks?: Artwork[]
}

export function toHallDto(hall: ExhibitionHall) {
  return {
    id: hall.id,
    artistId: hall.artistId,
    slug: hall.slug,
    title: hall.title,
    description: hall.description,
    coverImageUrl: hall.coverImageUrl,
    layoutConfig: hall.layoutConfig as unknown,
    theme: hall.theme,
    isPublished: hall.isPublished,
    viewCount: hall.viewCount,
    createdAt: hall.createdAt.toISOString(),
    updatedAt: hall.updatedAt.toISOString(),
  }
}

export function toHallPublicDto(hall: HallWithArtworks) {
  return {
    ...toHallDto(hall),
    artist: {
      id: hall.artist.id,
      displayName: hall.artist.user.displayName,
      avatarUrl: hall.artist.user.avatarUrl,
    },
    artworks: (hall.artworks ?? []).map((aw: Artwork) => ({
      id: aw.id,
      title: aw.title,
      posterUrl: aw.posterUrl,
      modelUrl: aw.modelUrl,
      mediaType: aw.mediaType,
      category: aw.category,
      price: aw.price?.toString() ?? null,
      currency: aw.currency,
      status: aw.status,
    })),
  }
}
