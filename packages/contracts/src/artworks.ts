import { z } from 'zod'

export const artworkCategorySchema = z.enum([
  'PAINTING',
  'DIGITAL',
  'PHOTOGRAPHY',
  'SCULPTURE',
  'MIXED_MEDIA',
  'NFT',
  'PRINT',
  'DRAWING',
  'OTHER',
])

export const artworkStatusSchema = z.enum([
  'DRAFT',
  'LISTED',
  'IN_EXHIBITION',
  'SOLD',
  'RESERVED',
  'ARCHIVED',
])

export const editionTypeSchema = z.enum(['UNIQUE', 'LIMITED', 'OPEN'])

export const artworkSchema = z.object({
  id: z.string().uuid(),
  artistId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  year: z.number().int().nullable(),
  medium: z.string().nullable(),
  dimensions: z.string().nullable(),
  category: artworkCategorySchema,
  styleTags: z.array(z.string()),
  images: z.array(z.string()),
  isDigitalOriginal: z.boolean(),
  isPhysicalDigitized: z.boolean(),
  status: artworkStatusSchema,
  price: z.string().nullable(),
  currency: z.string(),
  editionType: editionTypeSchema,
  editionTotal: z.number().int().nullable(),
  editionNumber: z.number().int().nullable(),
  allowOffers: z.boolean(),
  viewCount: z.number().int(),
  saveCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const artworkPublicSchema = artworkSchema.extend({
  artist: z
    .object({
      id: z.string().uuid(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      location: z.string().nullable(),
      verified: z.boolean(),
      hallSlug: z.string().nullable(),
    })
    .nullable(),
  artKey: z
    .object({
      keyCode: z.string(),
      ownerKey: z.string(),
    })
    .nullable(),
  latestProvenance: z
    .object({
      transferType: z.string(),
      toOwnerName: z.string().nullable(),
      createdAt: z.string().datetime(),
    })
    .nullable(),
})

export const artworkListSchema = z.object({
  artworks: z.array(artworkPublicSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const createArtworkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).optional(),
  year: z.number().int().min(1000).max(2100).optional(),
  medium: z.string().trim().max(200).optional(),
  dimensions: z.string().trim().max(100).optional(),
  category: artworkCategorySchema.default('OTHER'),
  styleTags: z.array(z.string().trim().max(50)).max(20).default([]),
  isDigitalOriginal: z.boolean().default(false),
  isPhysicalDigitized: z.boolean().default(false),
  price: z.number().positive().optional(),
  currency: z.string().default('RUB'),
  editionType: editionTypeSchema.default('UNIQUE'),
  editionTotal: z.number().int().positive().optional(),
  allowOffers: z.boolean().default(true),
})

export const updateArtworkSchema = createArtworkSchema.partial().extend({
  status: artworkStatusSchema.optional(),
})

export const artworkSearchSchema = z.object({
  q: z.string().optional(),
  category: artworkCategorySchema.optional(),
  status: artworkStatusSchema.optional(),
  style: z.string().optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  editionType: editionTypeSchema.optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type ArtworkDto = z.infer<typeof artworkSchema>
export type ArtworkPublicDto = z.infer<typeof artworkPublicSchema>
export type ArtworkListDto = z.infer<typeof artworkListSchema>
export type CreateArtworkRequest = z.input<typeof createArtworkSchema>
export type UpdateArtworkRequest = z.input<typeof updateArtworkSchema>
export type ArtworkSearch = z.infer<typeof artworkSearchSchema>
