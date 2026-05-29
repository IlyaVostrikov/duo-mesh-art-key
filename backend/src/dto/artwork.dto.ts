import type { Artwork, Artist, User, ExhibitionHall, ArtKey, ProvenanceRecord } from '../generated/prisma/client'

type ArtworkWithArtist = Artwork & {
  artist: Artist & { user: User; hall: ExhibitionHall | null }
}
type ArtworkFull = ArtworkWithArtist & {
  artKeys: ArtKey[]
  provenanceRecords: (ProvenanceRecord & { toOwner: User })[]
}

export function toArtworkDto(artwork: Artwork) {
  return {
    id: artwork.id,
    artistId: artwork.artistId,
    title: artwork.title,
    description: artwork.description,
    year: artwork.year,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    category: artwork.category,
    styleTags: artwork.styleTags,
    images: artwork.images,
    isDigitalOriginal: artwork.isDigitalOriginal,
    isPhysicalDigitized: artwork.isPhysicalDigitized,
    status: artwork.status,
    price: artwork.price?.toString() ?? null,
    currency: artwork.currency,
    editionType: artwork.editionType,
    editionTotal: artwork.editionTotal,
    editionNumber: artwork.editionNumber,
    allowOffers: artwork.allowOffers,
    viewCount: artwork.viewCount,
    saveCount: artwork.saveCount,
    createdAt: artwork.createdAt.toISOString(),
    updatedAt: artwork.updatedAt.toISOString(),
  }
}

export function toArtworkPublicDto(artwork: ArtworkWithArtist) {
  return {
    ...toArtworkDto(artwork),
    artist: {
      id: artwork.artist.id,
      displayName: artwork.artist.user.displayName,
      avatarUrl: artwork.artist.user.avatarUrl,
      location: artwork.artist.location,
      verified: artwork.artist.verified,
      hallSlug: artwork.artist.hall?.slug ?? null,
    },
    artKey: null as { keyCode: string; ownerKey: string } | null,
    latestProvenance: null as { transferType: string; toOwnerName: string | null; createdAt: string } | null,
  }
}

export function toArtworkPublicDtoFull(artwork: ArtworkFull) {
  const dto = toArtworkPublicDto(artwork)
  const artKey = artwork.artKeys[0]
  if (artKey) {
    dto.artKey = { keyCode: artKey.keyCode, ownerKey: artKey.ownerKey }
  }
  const lastProv = artwork.provenanceRecords.at(-1)
  if (lastProv) {
    dto.latestProvenance = {
      transferType: lastProv.transferType,
      toOwnerName: lastProv.toOwner.displayName,
      createdAt: lastProv.createdAt.toISOString(),
    }
  }
  return dto
}
