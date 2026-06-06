import type { DbClient } from '../db'
import { NotFoundError } from '../http/errors'

export class InquiryService {
  constructor(private prisma: DbClient) {}

  async create(data: { artworkId: string; fromName: string; fromEmail: string; message: string }) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: data.artworkId },
      include: { artist: true },
    })
    if (!artwork) throw new NotFoundError('Artwork not found')

    const inquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inquiry.create({ data })
      await tx.notification.create({
        data: {
          userId: artwork.artist.userId,
          type: 'INQUIRY_RECEIVED',
          title: `Новый запрос от ${data.fromName} / Inquiry from ${data.fromName}`,
          body: data.message || data.fromEmail,
          metadata: { inquiryId: created.id, fromEmail: data.fromEmail, artworkId: data.artworkId },
        },
      })
      return created
    })

    return inquiry
  }

  async listForArtist(artistId: string) {
    return this.prisma.inquiry.findMany({
      where: { artwork: { artistId } },
      include: { artwork: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }
}
