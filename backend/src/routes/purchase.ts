import { createHash } from 'node:crypto'
import { Hono } from 'hono'
import { authGuard, getAuthUser } from '../guards/auth'
import type { ArtKeyService } from '../services/art-key.service'
import type { ProvenanceTransferService } from '../services/provenance-transfer.service'
import type { SigningService } from '../services/signing.service'
import type { DbClient } from '../db'
import { canonicalJSON } from '../crypto/canonical'

class PurchaseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 409,
  ) {
    super(message)
  }
}

type PurchaseRouteEnv = {
  Variables: {
    artKeyService: ArtKeyService
    provenanceTransferService: ProvenanceTransferService
    signingService: SigningService
    prisma: DbClient
  }
}

export function createPurchaseRoutes() {
  const routes = new Hono<PurchaseRouteEnv>()

  routes.post('/art-keys/:keyCode/purchase', authGuard(), async (c) => {
    const artKeySvc = c.get('artKeyService')
    const transferSvc = c.get('provenanceTransferService')
    const signingSvc = c.get('signingService')
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)!

    const verification = await artKeySvc.verify(c.req.param('keyCode'))
    if (!verification) {
      return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    }

    if (verification.artKey.revokedAt) {
      return c.json({ error: 'REVOKED', message: 'This ArtKey has been revoked' }, 409)
    }

    // Find current owner from the last provenance record
    const lastProvenance = await prisma.provenanceRecord.findFirst({
      where: { artKeyId: verification.artKey.id },
      orderBy: { sequence: 'desc' },
      select: { toUserId: true },
    })

    if (!lastProvenance) {
      return c.json({ error: 'NO_PROVENANCE', message: 'No provenance records found' }, 500)
    }

    // Fetch all sale-type records in one query — used for ALREADY_OWNED check AND transfer type
    const existingSales = await prisma.provenanceRecord.findMany({
      where: {
        artKeyId: verification.artKey.id,
        transferType: { in: ['PRIMARY_SALE', 'SECONDARY_SALE'] },
      },
      select: { id: true, toUserId: true },
    })

    if (existingSales.some((s) => s.toUserId === authUser.userId)) {
      return c.json({ error: 'ALREADY_OWNED', message: 'You already own this artwork' }, 409)
    }

    const price = verification.artwork.price ? Number(verification.artwork.price) : 0
    if (price <= 0) {
      return c.json({ error: 'NOT_FOR_SALE', message: 'This artwork has no price set' }, 400)
    }

    const transferType = existingSales.length === 0 ? 'PRIMARY_SALE' : 'SECONDARY_SALE'

    // Sign as platform (escrow/notary)
    const platformKey = await signingSvc.getPlatformActivePublicKey()
    if (!platformKey) {
      return c.json({ error: 'NO_KEY', message: 'Platform signing key not available' }, 500)
    }

    // ─── Atomic purchase: use interactive transaction to prevent TOCTOU ───
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Re-read artwork inside transaction — atomic status check
        const fresh = await tx.artwork.findUnique({
          where: { id: verification.artwork.id },
          select: { status: true, artistId: true, title: true },
        })
        if (!fresh || fresh.status === 'SOLD') {
          throw new PurchaseError('NOT_AVAILABLE', 'This artwork has already been sold')
        }

        // Atomically mark as SOLD — fails if status already changed
        const updated = await tx.artwork.updateMany({
          where: { id: verification.artwork.id, status: { not: 'SOLD' } },
          data: { status: 'SOLD' },
        })
        if (updated.count === 0) {
          throw new PurchaseError('NOT_AVAILABLE', 'This artwork has already been sold')
        }

        const provenanceResult = await transferSvc.createTransfer({
          artworkId: verification.artwork.id,
          artKeyId: verification.artKey.id,
          fromUserId: lastProvenance.toUserId,
          toUserId: authUser.userId,
          transferType: transferType as 'PRIMARY_SALE' | 'SECONDARY_SALE',
          price: price || undefined,
          signerKeyId: platformKey.keyId,
          signerRole: 'PLATFORM',
        }, tx as DbClient)

        // Ensure buyer has Collector profile
        let collector = await tx.collector.findUnique({
          where: { userId: authUser.userId },
          select: { id: true },
        })
        if (!collector) {
          collector = await tx.collector.create({
            data: { userId: authUser.userId },
            select: { id: true },
          })
        }

        await tx.sale.create({
          data: {
            artworkId: verification.artwork.id,
            sellerId: fresh.artistId,
            buyerId: collector.id,
            type: 'DIRECT_SALE',
            price,
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        })

        // Notify seller
        const [artistOwner, buyerUser] = await Promise.all([
          tx.artist.findUnique({
            where: { id: fresh.artistId },
            select: { userId: true },
          }),
          tx.user.findUnique({
            where: { id: authUser.userId },
            select: { displayName: true },
          }),
        ])
        if (artistOwner) {
          await tx.notification.create({
            data: {
              userId: artistOwner.userId,
              type: 'ARTWORK_SOLD',
              title: 'Работа продана / Artwork Sold',
              body: fresh.title,
              metadata: {
                artworkId: verification.artwork.id,
                keyCode: verification.artKey.keyCode,
                price,
                buyerName: buyerUser?.displayName ?? 'Anonymous',
              },
            },
          })
          await tx.artist.update({
            where: { id: fresh.artistId },
            data: {
              totalSalesCount: { increment: 1 },
              totalRevenue: { increment: price },
            },
          })
        }

        // Append to transparency log
        const lastLog = await tx.transparencyLogEntry.findFirst({
          where: { artKeyId: verification.artKey.id },
          orderBy: { sequence: 'desc' },
          select: { sequence: true, entryHash: true },
        })
        const logPayload = {
          artKeyId: verification.artKey.id,
          sequence: (lastLog?.sequence ?? -1) + 1,
          entryType: 'PROVENANCE_RECORD' as const,
          timestamp: new Date().toISOString(),
          recordHash: provenanceResult.record.recordHash,
          transferType,
          fromUserId: lastProvenance.toUserId,
          toUserId: authUser.userId,
          price,
        }
        const logHash = createHash('sha256')
          .update(canonicalJSON(logPayload))
          .digest('hex')
        await tx.transparencyLogEntry.create({
          data: {
            artKeyId: verification.artKey.id,
            sequence: (lastLog?.sequence ?? -1) + 1,
            entryType: 'PROVENANCE_RECORD',
            entryHash: logHash,
            prevEntryHash: lastLog?.entryHash ?? null,
            payload: logPayload,
          },
        })

        return provenanceResult
      })

      return c.json(
        {
          keyCode: verification.artKey.keyCode,
          integrityHash: verification.artKey.integrityHash,
          verified: verification.verified,
          artworkTitle: verification.artwork.title,
          artworkPosterUrl: verification.artwork.posterUrl,
          transfer: {
            recordHash: result.record.recordHash,
            sequence: result.record.sequence,
            signature: result.record.signature,
            signerPublicKey: result.record.signerPublicKey,
          },
        },
        201,
      )
    } catch (err) {
      if (err instanceof PurchaseError) {
        return c.json({ error: err.code, message: err.message }, err.status as 400 | 409)
      }
      throw err
    }
  })

  return routes
}
