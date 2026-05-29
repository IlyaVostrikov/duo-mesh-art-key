import { z } from 'zod'

export const notificationTypeSchema = z.enum([
  'PREMIERE_SOON',
  'PREMIERE_STARTED',
  'ARTWORK_SOLD',
  'NEW_FOLLOWER',
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'COLLECTION_UPDATED',
  'NEW_ARTWORK',
  'EXHIBITION_INVITE',
])

export const inquirySchema = z.object({
  id: z.string().uuid(),
  artworkId: z.string().uuid(),
  fromName: z.string(),
  fromEmail: z.string(),
  message: z.string().nullable(),
  isResolved: z.boolean(),
  createdAt: z.string().datetime(),
})

export const createInquirySchema = z.object({
  artworkId: z.string().uuid(),
  fromName: z.string().trim().min(1).max(100),
  fromEmail: z.string().trim().email().max(254),
  message: z.string().trim().max(2000).optional(),
})

export const followResponseSchema = z.object({
  isFollowing: z.boolean(),
  followersCount: z.number().int(),
})

export const searchResultSchema = z.object({
  artworks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      artistName: z.string().nullable(),
      images: z.array(z.string()),
      category: z.string(),
      price: z.string().nullable(),
      currency: z.string(),
      status: z.string(),
    }),
  ),
  artists: z.array(
    z.object({
      id: z.string().uuid(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      hallSlug: z.string().nullable(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
})

export type InquiryDto = z.infer<typeof inquirySchema>
export type CreateInquiryRequest = z.input<typeof createInquirySchema>
export type FollowResponse = z.infer<typeof followResponseSchema>
export type SearchResultDto = z.infer<typeof searchResultSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
