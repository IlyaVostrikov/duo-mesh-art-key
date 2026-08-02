import type { DbClient } from '../db'
import type { SigningService, ProvenancePayload } from './signing.service'
import { hashPayload } from '../crypto'
import type { TransferType } from '../generated/prisma/enums'

export class ProvenanceTransferService {
  constructor(
    private prisma: DbClient,
    private signingService: SigningService,
  ) {}

  async createTransfer(
    params: {
      artworkId: string
      artKeyId: string
      fromUserId: string
      toUserId: string
      transferType: TransferType
      price?: number
      royaltyPercent?: number
      notes?: string
      signerKeyId: string
      signerRole: 'ARTIST' | 'PLATFORM'
    },
    tx?: DbClient,
  ): Promise<{
    record: { id: string; sequence: number; recordHash: string; signature: string | null; signerPublicKey: string | null; signerRole: string | null }
  }> {
    // Self-wrap in a transaction when the caller doesn't provide one,
    // so the sequence read and record insert are atomic.
    if (!tx) {
      return this.prisma.$transaction((trx) => this.createTransfer(params, trx as unknown as DbClient))
    }

    const db = tx

    // Find the latest sequence number
    const lastRecord = await db.provenanceRecord.findFirst({
      where: { artKeyId: params.artKeyId },
      orderBy: { sequence: 'desc' },
    })

    const nextSequence = lastRecord ? lastRecord.sequence + 1 : 0
    const prevRecordHash = lastRecord?.recordHash ?? ''

    const occurredAt = new Date()
    const payload: ProvenancePayload = {
      artworkId: params.artworkId,
      sequence: nextSequence,
      eventType: params.transferType,
      fromOwner: params.fromUserId,
      toOwner: params.toUserId,
      occurredAt: occurredAt.toISOString(),
      prevRecordHash,
    }

    const recordHash = hashPayload(payload)
    const { signature, signerPublicKey } =
      await this.signingService.signProvRecord(
        payload,
        params.signerKeyId,
        params.signerRole,
      )

    const record = await db.provenanceRecord.create({
      data: {
        artworkId: params.artworkId,
        artKeyId: params.artKeyId,
        sequence: nextSequence,
        fromUserId: params.fromUserId,
        toUserId: params.toUserId,
        transferType: params.transferType,
        price: params.price,
        royaltyPercent: params.royaltyPercent ?? 10,
        notes: params.notes,
        recordHash,
        prevRecordHash,
        signature,
        signerPublicKey,
        signerRole: params.signerRole,
        signingKeyId: params.signerKeyId,
        occurredAt,
      },
    })

    return {
      record: {
        id: record.id,
        sequence: record.sequence,
        recordHash: record.recordHash,
        signature: record.signature,
        signerPublicKey: record.signerPublicKey,
        signerRole: record.signerRole,
      },
    }
  }
}
