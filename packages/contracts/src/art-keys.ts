import { z } from 'zod'

export const artKeySchema = z.object({
  id: z.string().uuid(),
  artworkId: z.string().uuid(),
  keyCode: z.string(),
  ownerKey: z.string(),
  certificateHash: z.string(),
  integrityHash: z.string(),
  certificatePdfUrl: z.string().nullable(),
  qrCodeUrl: z.string().nullable(),
  nfcId: z.string().nullable(),
  issuedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
})

export const artKeyPublicSchema = artKeySchema.extend({
  artwork: z.object({
    id: z.string().uuid(),
    title: z.string(),
    artistName: z.string().nullable(),
  }),
})

export const provenanceRecordSchema = z.object({
  id: z.string().uuid(),
  artworkId: z.string().uuid(),
  artKeyId: z.string().uuid(),
  sequence: z.number().int(),
  fromUserId: z.string().uuid().nullable(),
  toUserId: z.string().uuid(),
  transferType: z.enum(['CREATION', 'PRIMARY_SALE', 'SECONDARY_SALE', 'GIFT', 'INHERITANCE', 'TRANSFER']),
  price: z.string().nullable(),
  royaltyPercent: z.string().nullable(),
  royaltyPaid: z.string().nullable(),
  transactionHash: z.string().nullable(),
  recordHash: z.string(),
  prevRecordHash: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  fromOwnerName: z.string().nullable(),
  toOwnerName: z.string().nullable(),
})

export const artKeyVerificationSchema = z.object({
  artKey: artKeyPublicSchema,
  provenance: z.array(provenanceRecordSchema),
  isValid: z.boolean(),
  currentOwner: z.string().nullable(),
})

export type ArtKeyDto = z.infer<typeof artKeySchema>
export type ArtKeyPublicDto = z.infer<typeof artKeyPublicSchema>
export type ArtKeyVerificationDto = z.infer<typeof artKeyVerificationSchema>
