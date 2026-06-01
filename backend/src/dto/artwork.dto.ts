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

export interface ArtworkDto {
  id: string
  artistId: string
  title: string
  description: string | null
  year: number | null
  medium: string | null
  dimensions: string | null
  category: string
  styleTags: string[]
  images: string[]
  mediaType: string
  posterUrl: string
  modelUrl: string | null
  software: string | null
  isScanned: boolean
  polyCount: number | null
  isDigitalOriginal: boolean
  isPhysicalDigitized: boolean
  status: string
  price: string | null
  currency: string
  editionType: string | null
  editionTotal: number | null
  editionNumber: number | null
  allowOffers: boolean
  viewCount: number
  saveCount: number
  createdAt: string
  updatedAt: string
}

export interface ArtworkPublicDto extends ArtworkDto {
  artist: {
    id: string
    displayName: string | null
    avatarUrl: string | null
    location: string | null
    verified: boolean
    hallSlug: string | null
  }
  artKey: {
    keyCode: string
    ownerKey: string
    integrityHash: string
    issuedAt: string
  } | null
  latestProvenance: {
    transferType: string
    toOwnerName: string | null
    createdAt: string
  } | null
}

export interface ArtworkPublicFullDto extends ArtworkPublicDto {
  provenance: Array<{
    sequence: number
    transferType: string
    fromOwnerName: string | null
    toOwnerName: string | null
    price: string | null
    recordHash: string
    prevRecordHash: string | null
    createdAt: string
  }>
}

export function toArtworkDto(artwork: Artwork): ArtworkDto {
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
export function toArtworkPublicDto(artwork: ArtworkWithKeys): ArtworkPublicDto {
  const dto: ArtworkPublicDto = {
    ...toArtworkDto(artwork),
    artist: {
      id: artwork.artist.id,
      displayName: artwork.artist.user.displayName,
      avatarUrl: artwork.artist.user.avatarUrl,
      location: artwork.artist.location,
      verified: artwork.artist.verified,
      hallSlug: artwork.artist.hall?.slug ?? null,
    },
    artKey: null,
    latestProvenance: null,
  }

  const artKey = artwork.artKeys?.[0]
  if (artKey) {
    dto.artKey = {
      keyCode: artKey.keyCode,
      ownerKey: artKey.ownerKey,
      integrityHash: artKey.integrityHash,
      issuedAt: artKey.issuedAt.toISOString(),
    }
  }

  const lastProv = artwork.provenanceRecords?.at(-1)
  if (lastProv) {
    dto.latestProvenance = {
      transferType: lastProv.transferType,
      toOwnerName: lastProv.toOwner.displayName,
      createdAt: lastProv.createdAt.toISOString(),
    }
  }

  return dto
}

/** Full public DTO for detail views — includes full provenance chain */
export function toArtworkPublicDtoFull(artwork: ArtworkFull): ArtworkPublicFullDto {
  const dto = toArtworkPublicDto(artwork) as ArtworkPublicFullDto

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
