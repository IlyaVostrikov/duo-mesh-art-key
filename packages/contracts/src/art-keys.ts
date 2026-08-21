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
  timestampToken: z.string().nullable(),
  platformSignature: z.string().nullable(),
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
  signature: z.string().nullable(),
  signerPublicKey: z.string().nullable(),
  signerRole: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  fromOwnerName: z.string().nullable(),
  toOwnerName: z.string().nullable(),
})

export const artKeyVerificationSchema = z.object({
  artKey: z.object({
    id: z.string().uuid(),
    keyCode: z.string(),
    ownerKey: z.string(),
    integrityHash: z.string(),
    certificateHash: z.string(),
    issuedAt: z.string().datetime(),
    revokedAt: z.string().datetime().nullable(),
    timestampToken: z.string().nullable(),
    platformSignature: z.string().nullable(),
  }),
  artwork: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    year: z.number().int().nullable(),
    medium: z.string().nullable(),
    posterUrl: z.string().nullable(),
    modelUrl: z.string().nullable(),
    mediaType: z.string(),
    status: z.string(),
    price: z.string().nullable(),
    currency: z.string(),
  }),
  artist: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    hallSlug: z.string().nullable(),
  }),
  provenance: z.array(
    z.object({
      sequence: z.number().int(),
      transferType: z.string(),
      fromOwnerName: z.string().nullable(),
      toOwnerName: z.string(),
      price: z.string().nullable(),
      recordHash: z.string(),
      prevRecordHash: z.string().nullable(),
      signature: z.string().nullable(),
      signerPublicKey: z.string().nullable(),
      signerRole: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
  verified: z.boolean(),
  checks: z.array(
    z.object({
      label: z.string(),
      pass: z.boolean(),
      detail: z.string(),
      category: z.string(),
    }),
  ),
  currentOwner: z.string().nullable(),
})

export type ArtKeyDto = z.infer<typeof artKeySchema>
export type ArtKeyPublicDto = z.infer<typeof artKeyPublicSchema>
export type ArtKeyVerificationDto = z.infer<typeof artKeyVerificationSchema>
