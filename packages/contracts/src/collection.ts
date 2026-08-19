import { z } from 'zod'
import { artworkPublicSchema } from './artworks'

export const saveArtworkResponseSchema = z.object({
  saved: z.boolean(),
  saveCount: z.number().int(),
})

export const savedArtworkListSchema = z.object({
  artworks: z.array(artworkPublicSchema),
  total: z.number().int(),
})

export const savedIdsSchema = z.object({
  artworkIds: z.array(z.string().uuid()),
})

export type SaveArtworkResponse = z.infer<typeof saveArtworkResponseSchema>
export type SavedArtworkListDto = z.infer<typeof savedArtworkListSchema>
export type SavedIdsDto = z.infer<typeof savedIdsSchema>
