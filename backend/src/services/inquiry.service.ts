import type { DbClient } from '../db'
import { NotFoundError } from '../http/errors'

export class InquiryService {
  constructor(private prisma: DbClient) {}

  async create(data: { artworkId: string; fromName: string; fromEmail: string; message: string }) {
    const artwork = await this.prisma.artwork.findUnique({ where: { id: data.artworkId } })
    if (!artwork) throw new NotFoundError('Artwork not found')

    return this.prisma.inquiry.create({ data })
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
