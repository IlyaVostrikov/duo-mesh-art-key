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

export const hallCustomizationSchema = z.object({
  wallTheme: z.enum(['default', 'dark', 'warm', 'cool', 'custom']).optional(),
  wallColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  floorType: z.enum(['wood', 'marble', 'concrete', 'darkWood', 'parquet']).optional(),
  frameStyle: z.enum(['classic', 'modern', 'ornate', 'minimal', 'floating']).optional(),
  lightingPreset: z.enum(['warm', 'cool', 'neutral', 'dramatic']).optional(),
  accentLight: z.enum(['none', 'blue', 'purple', 'gold', 'green']).optional(),
  pedestalStyle: z.enum(['marble', 'wood', 'metal', 'concrete']).optional(),
  roomShape: z.enum(['rectangle', 'wide', 'deep', 'lShape']).optional(),
  ceilingStyle: z.enum(['flat', 'coffered', 'vaulted']).optional(),
})

export const updateHallSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  coverImageUrl: z.string().trim().url().optional(),
  layoutConfig: z.record(z.string(), z.unknown()).optional(),
  theme: z.string().trim().max(50).optional(),
  customization: hallCustomizationSchema.optional(),
  isPublished: z.boolean().optional(),
})

export type HallCustomization = z.input<typeof hallCustomizationSchema>
export type ExhibitionHallDto = z.infer<typeof exhibitionHallSchema>
export type ExhibitionHallPublicDto = z.infer<typeof exhibitionHallPublicSchema>
export type UpdateHallRequest = z.input<typeof updateHallSchema>
