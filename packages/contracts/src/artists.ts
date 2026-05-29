import { z } from 'zod'

export const artistTierSchema = z.enum(['FREE', 'PRO', 'GALLERY'])

export const artistSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  artistStatement: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  location: z.string().nullable(),
  verified: z.boolean(),
  tier: artistTierSchema,
  totalSalesCount: z.number().int(),
  totalRevenue: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const artistPublicSchema = artistSchema.extend({
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  socialLinks: z.unknown().nullable(),
  hall: z
    .object({
      slug: z.string(),
      title: z.string(),
      coverImageUrl: z.string().nullable(),
      isPublished: z.boolean(),
    })
    .nullable(),
  followersCount: z.number().int(),
  isFollowed: z.boolean().optional(),
})

export const artistListSchema = z.object({
  artists: z.array(artistPublicSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const updateArtistSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  artistStatement: z.string().trim().max(5000).optional(),
  websiteUrl: z.union([z.string().trim().url(), z.literal('')]).optional(),
  location: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
})

export type ArtistDto = z.infer<typeof artistSchema>
export type ArtistPublicDto = z.infer<typeof artistPublicSchema>
export type ArtistListDto = z.infer<typeof artistListSchema>
export type UpdateArtistRequest = z.input<typeof updateArtistSchema>
