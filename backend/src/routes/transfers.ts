import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authGuard, getAuthUser, requireRole } from '../guards/auth'
import type { ProvenanceTransferService } from '../services/provenance-transfer.service'
import type { SigningService } from '../services/signing.service'
import type { ApiErrorCode } from '@duo-mesh/contracts'
import type { DbClient } from '../db'
import { isUniqueConstraintOn } from '../db-errors'
import { errorResponse } from '../http/errors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { TransparencyLogService } from '../services/transparency-log.service'

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

type TransferRouteEnv = {
  Variables: {
    prisma: DbClient
    provenanceTransferService: ProvenanceTransferService
    signingService: SigningService
    authService: { verifyAccessToken: (token: string) => Promise<{ userId: string; role: string; sessionId: string } | null> }
  }
}

export function createTransferRoutes() {
  const routes = new Hono<TransferRouteEnv>()

  routes.post(
    '/art-keys/:keyCode/transfer',
    authGuard(),
    requireRole('ARTIST', 'ADMIN'),
    zValidator('json', transferSchema),
    async (c) => {
      const { keyCode } = c.req.param()
      const { toUserId, notes } = c.req.valid('json')
      const authUser = getAuthUser(c)
      if (!authUser) {
        return c.json(errorResponse('UNAUTHORIZED', 'Authentication required'), 401)
      }

      const prisma = c.get('prisma')
      const provenanceTransferService = c.get('provenanceTransferService')

      // 1. Find ArtKey by keyCode
      const artKey = await prisma.artKey.findUnique({
        where: { keyCode },
        include: {
          artwork: { select: { id: true, artistId: true } },
          provenanceRecords: {
            orderBy: { sequence: 'desc' },
            take: 1,
            select: { sequence: true, toUserId: true },
          },
        },
      })
      if (!artKey) {
        return c.json(errorResponse('NOT_FOUND', 'ArtKey not found'), 404)
      }
      if (artKey.revokedAt) {
        return c.json(errorResponse('CONFLICT', 'ArtKey has been revoked'), 409)
      }

      // 2. Verify current owner
      const lastRecord = artKey.provenanceRecords[0]
      if (!lastRecord) {
        return c.json(errorResponse('CONFLICT', 'ArtKey has no provenance records'), 409)
      }
      if (lastRecord.toUserId !== authUser.userId && authUser.role !== 'ADMIN') {
        return c.json(errorResponse('FORBIDDEN', 'Only the current owner can transfer this ArtKey'), 403)
      }
      if (lastRecord.toUserId === toUserId) {
        return c.json(errorResponse('CONFLICT', 'Cannot transfer ArtKey to the same owner'), 409)
      }

      // 3. Verify recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true },
      })
      if (!recipient) {
        return c.json(errorResponse('NOT_FOUND', 'Recipient user not found'), 404)
      }

      // 4. Atomic transfer inside $transaction
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Re-check current owner inside transaction lock
          const currentLast = await tx.provenanceRecord.findFirst({
            where: { artKeyId: artKey.id, artKey: { revokedAt: null } },
            orderBy: { sequence: 'desc' },
            select: { toUserId: true, sequence: true },
          })
          if (!currentLast) {
            throw new TransactionError('CONFLICT', 'ArtKey provenance changed during transfer')
          }
          if (currentLast.toUserId !== authUser.userId && authUser.role !== 'ADMIN') {
            throw new TransactionError('FORBIDDEN', 'Ownership changed during transfer')
          }
          if (currentLast.toUserId === toUserId) {
            throw new TransactionError('CONFLICT', 'Recipient is already the owner')
          }

          // Get artist's signing key for the provenance record; fall back to the
          // platform key when the artist has none configured.
          const artistSigningKey = await tx.signingKey.findFirst({
            where: { ownerType: 'ARTIST', ownerId: artKey.artwork.artistId, isActive: true },
            select: { id: true },
          })
          const platformSigningKey = artistSigningKey
            ? null
            : await tx.signingKey.findFirst({
                where: { ownerType: 'PLATFORM', isActive: true },
                select: { id: true },
              })
          const signerKey = artistSigningKey ?? platformSigningKey
          if (!signerKey) {
            throw new TransactionError('INTERNAL_ERROR', 'No signing key available for provenance', 500)
          }

          // Create provenance record
          const { record } = await provenanceTransferService.createTransfer(
            {
              artworkId: artKey.artworkId,
              artKeyId: artKey.id,
              fromUserId: authUser.userId,
              toUserId,
              transferType: 'TRANSFER',
              notes,
              signerKeyId: signerKey.id,
              signerRole: artistSigningKey ? 'ARTIST' : 'PLATFORM',
            },
            tx as unknown as DbClient,
          )

          // Append to transparency log
          const tls = new TransparencyLogService(tx as unknown as DbClient)
          await tls.append({
            artKeyId: artKey.id,
            entryType: 'PROVENANCE_RECORD',
            payload: {
              sequence: record.sequence,
              recordHash: record.recordHash,
              transferType: 'TRANSFER',
              fromUserId: authUser.userId,
              toUserId,
            },
          })

          return record
        })

        return c.json({
          success: true,
          transfer: {
            sequence: result.sequence,
            recordHash: result.recordHash,
            signature: result.signature,
            signerPublicKey: result.signerPublicKey,
            signerRole: result.signerRole,
          },
        }, 200)
      } catch (err) {
        if (err instanceof TransactionError) {
          return c.json(errorResponse(err.code, err.message), err.status)
        }
        // P2002 on the (artKeyId, sequence) unique index = concurrent transfer
        // race. The composite target never equals the scalar 'artKeyId', so this
        // must match the driver-specific composite shape (see db-errors.ts).
        if (isUniqueConstraintOn(err, 'ProvenanceRecord', ['artKeyId', 'sequence'])) {
          return c.json(
            errorResponse('CONFLICT', 'Another transfer was processed concurrently. Please retry.'),
            409,
          )
        }
        throw err
      }
    },
  )

  return routes
}

class TransactionError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: ContentfulStatusCode = 409,
  ) {
    super(message)
    this.name = 'TransactionError'
  }
}
