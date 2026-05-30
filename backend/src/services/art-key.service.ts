import crypto from 'node:crypto'
import type { DbClient } from '../db'

function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

export class ArtKeyService {
  constructor(private prisma: DbClient) {}

  async generate(artworkId: string, artistId: string, userId: string) {
    const existing = await this.prisma.artKey.findUnique({ where: { artworkId } })
    if (existing) return existing

    const year = new Date().getFullYear()
    const keyCode = `DUO-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const ownerKey = `X${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const issuedAt = new Date()

    const integrityHash = crypto
      .createHash('sha256')
      .update(canonicalJSON({ artworkId, keyCode, artistId, issuedAt: issuedAt.toISOString() }))
      .digest('hex')

    const certificateHash = crypto
      .createHash('sha256')
      .update(`${artworkId}:${keyCode}:${ownerKey}:${Date.now()}`)
      .digest('hex')

    const artKey = await this.prisma.artKey.create({
      data: {
        artworkId,
        keyCode,
        ownerKey,
        certificateHash,
        integrityHash,
      },
    })

    // Genesis provenance record — anchored to Art Key integrityHash
    const genesisHash = crypto
      .createHash('sha256')
      .update(
        canonicalJSON({
          artworkId,
          sequence: 0,
          eventType: 'CREATION',
          actor: artistId,
          occurredAt: issuedAt.toISOString(),
          prevRecordHash: integrityHash,
        }),
      )
      .digest('hex')

    await this.prisma.provenanceRecord.create({
      data: {
        artworkId,
        artKeyId: artKey.id,
        sequence: 0,
        toUserId: userId,
        transferType: 'CREATION',
        recordHash: genesisHash,
        prevRecordHash: integrityHash,
      },
    })

    return artKey
  }

  async verify(keyCode: string) {
    const artKey = await this.prisma.artKey.findUnique({
      where: { keyCode },
      include: {
        artwork: {
          include: { artist: { include: { user: true } } },
        },
      },
    })
    if (!artKey) return null

    const provenance = await this.prisma.provenanceRecord.findMany({
      where: { artworkId: artKey.artworkId },
      include: { toOwner: true, fromOwner: true },
      orderBy: { sequence: 'asc' },
    })

    const isValid = !artKey.revokedAt
    const currentOwner = provenance.at(-1)?.toOwner.displayName ?? null

    return {
      artKey: {
        ...artKey,
        artwork: {
          id: artKey.artwork.id,
          title: artKey.artwork.title,
          artistName: artKey.artwork.artist.user.displayName,
        },
        issuedAt: artKey.issuedAt.toISOString(),
        revokedAt: artKey.revokedAt?.toISOString() ?? null,
      },
      provenance: provenance.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        fromOwnerName: p.fromOwner?.displayName ?? null,
        toOwnerName: p.toOwner.displayName,
        price: p.price?.toString() ?? null,
        royaltyPercent: p.royaltyPercent?.toString() ?? null,
        royaltyPaid: p.royaltyPaid?.toString() ?? null,
      })),
      isValid,
      currentOwner,
    }
  }
}
