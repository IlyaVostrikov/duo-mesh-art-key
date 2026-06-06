import { Hono } from 'hono'
import { z } from 'zod'
import { authGuard, getAuthUser } from '../guards/auth'
import type { ArtKeyService } from '../services/art-key.service'
import type { ProvenanceTransferService } from '../services/provenance-transfer.service'
import type { SigningService } from '../services/signing.service'
import type { DbClient } from '../db'

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  transferType: z.enum(['PRIMARY_SALE', 'SECONDARY_SALE', 'GIFT', 'INHERITANCE', 'TRANSFER']),
  price: z.number().positive().optional(),
  royaltyPercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
})

type TransferRouteEnv = {
  Variables: {
    provenanceTransferService: ProvenanceTransferService
    artKeyService: ArtKeyService
    signingService: SigningService
    prisma: DbClient
  }
}

export function createTransferRoutes() {
  const routes = new Hono<TransferRouteEnv>()

  // Any authenticated user who owns the artwork can initiate a transfer.
  routes.post('/art-keys/:keyCode/transfer', authGuard(), async (c) => {
    const artKeySvc = c.get('artKeyService')
    const transferSvc = c.get('provenanceTransferService')
    const signingSvc = c.get('signingService')
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)!

    const verification = await artKeySvc.verify(c.req.param('keyCode'))
    if (!verification) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)

    if (verification.artKey.revokedAt) {
      return c.json({ error: 'REVOKED', message: 'This ArtKey has been revoked' }, 409)
    }

    // Verify the caller owns this artwork
    const lastProvenance = await prisma.provenanceRecord.findFirst({
      where: { artKeyId: verification.artKey.id },
      orderBy: { sequence: 'desc' },
      select: { toUserId: true },
    })
    if (!lastProvenance || lastProvenance.toUserId !== authUser.userId) {
      return c.json({ error: 'FORBIDDEN', message: 'You do not own this artwork' }, 403)
    }

    const body = await c.req.json()
    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.issues }, 400)
    }

    const platformKey = await signingSvc.getPlatformActivePublicKey()
    if (!platformKey) {
      return c.json({ error: 'NO_KEY', message: 'No active signing key found' }, 400)
    }

    const result = await transferSvc.createTransfer({
      artworkId: verification.artwork.id,
      artKeyId: verification.artKey.id,
      fromUserId: authUser.userId,
      toUserId: parsed.data.toUserId,
      transferType: parsed.data.transferType as 'PRIMARY_SALE' | 'SECONDARY_SALE' | 'GIFT' | 'INHERITANCE' | 'TRANSFER',
      price: parsed.data.price,
      royaltyPercent: parsed.data.royaltyPercent,
      notes: parsed.data.notes,
      signerKeyId: platformKey.keyId,
      signerRole: 'PLATFORM',
    })

    return c.json(result, 201)
  })

  return routes
}
