import { z } from 'zod'

export const exhibitionHallSchema = z.object({
  id: z.string().uuid(),
  artistId: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  layoutConfig: z.unknown().nullable(),
  theme: z.string().nullable(),
  isPublished: z.boolean(),
  viewCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const exhibitionHallPublicSchema = exhibitionHallSchema.extend({
  artist: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  artworks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      images: z.array(z.string()),
      category: z.string(),
      price: z.string().nullable(),
      currency: z.string(),
      status: z.string(),
    }),
  ),
})

export const updateHallSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  coverImageUrl: z.string().trim().url().optional(),
  layoutConfig: z.record(z.string(), z.unknown()).optional(),
  theme: z.string().trim().max(50).optional(),
  isPublished: z.boolean().optional(),
})

export type ExhibitionHallDto = z.infer<typeof exhibitionHallSchema>
export type ExhibitionHallPublicDto = z.infer<typeof exhibitionHallPublicSchema>
export type UpdateHallRequest = z.input<typeof updateHallSchema>
