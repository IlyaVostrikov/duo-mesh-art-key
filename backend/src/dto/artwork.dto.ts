import type { Artwork, Artist, User, ExhibitionHall, ArtKey, ProvenanceRecord } from '../generated/prisma/client'

type ArtworkWithArtist = Artwork & {
  artist: Artist & { user: User; hall: ExhibitionHall | null }
}
type ArtworkWithKeys = ArtworkWithArtist & {
  artKeys: ArtKey[]
  provenanceRecords: (ProvenanceRecord & { toOwner: User })[]
}
type ArtworkFull = ArtworkWithArtist & {
  artKeys: ArtKey[]
  provenanceRecords: (ProvenanceRecord & { toOwner: User; fromOwner: User | null })[]
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
    mediaType: artwork.mediaType,
    posterUrl: artwork.posterUrl,
    modelUrl: artwork.modelUrl,
    software: artwork.software,
    isScanned: artwork.isScanned,
    polyCount: artwork.polyCount,
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

/** Lightweight public DTO for list views — includes artKey summary + latest provenance */
export function toArtworkPublicDto(artwork: ArtworkWithKeys) {
  const dto: Record<string, unknown> = {
    ...toArtworkDto(artwork),
    artist: {
      id: artwork.artist.id,
      displayName: artwork.artist.user.displayName,
      avatarUrl: artwork.artist.user.avatarUrl,
      location: artwork.artist.location,
      verified: artwork.artist.verified,
      hallSlug: artwork.artist.hall?.slug ?? null,
    },
  }

  const artKey = artwork.artKeys?.[0]
  dto.artKey = artKey
    ? { keyCode: artKey.keyCode, ownerKey: artKey.ownerKey, integrityHash: artKey.integrityHash, issuedAt: artKey.issuedAt.toISOString() }
    : null
  const lastProv = artwork.provenanceRecords?.at(-1)
  dto.latestProvenance = lastProv
    ? { transferType: lastProv.transferType, toOwnerName: lastProv.toOwner.displayName, createdAt: lastProv.createdAt.toISOString() }
    : null

  return dto
}

/** Full public DTO for detail views — includes full provenance chain */
export function toArtworkPublicDtoFull(artwork: ArtworkFull) {
  const dto = toArtworkPublicDto(artwork as any) as Record<string, unknown>

  dto.provenance = artwork.provenanceRecords.map((rec) => ({
    sequence: rec.sequence,
    transferType: rec.transferType,
    fromOwnerName: rec.fromOwner?.displayName ?? null,
    toOwnerName: rec.toOwner.displayName,
    price: rec.price?.toString() ?? null,
    recordHash: rec.recordHash,
    prevRecordHash: rec.prevRecordHash,
    createdAt: rec.createdAt.toISOString(),
  }))

  return dto
}
