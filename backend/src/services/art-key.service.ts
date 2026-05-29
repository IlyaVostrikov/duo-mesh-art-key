import crypto from 'node:crypto'
import type { DbClient } from '../db'

export class ArtKeyService {
  constructor(private prisma: DbClient) {}

  async generate(artworkId: string, artistId: string) {
    // Check if ArtKey already exists
    const existing = await this.prisma.artKey.findUnique({ where: { artworkId } })
    if (existing) return existing

    const keyCode = `DUO-${new Date().getFullYear()}-${artworkId.substring(0, 8).toUpperCase()}`
    const ownerKey = `X${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const certificateHash = crypto.createHash('sha256').update(`${artworkId}:${keyCode}:${ownerKey}:${Date.now()}`).digest('hex')

    const artKey = await this.prisma.artKey.create({
      data: {
        artworkId,
        keyCode,
        ownerKey,
        certificateHash,
      },
    })

    // Create initial provenance record (CREATION)
    const prevHash = crypto.createHash('sha256').update(`${artworkId}:creation:${Date.now()}`).digest('hex')
    await this.prisma.provenanceRecord.create({
      data: {
        artworkId,
        artKeyId: artKey.id,
        toUserId: artistId,
        transferType: 'CREATION',
        prevRecordHash: prevHash,
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
      orderBy: { createdAt: 'asc' },
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
