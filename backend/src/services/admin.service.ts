import type { DbClient } from '../db'

const VALID_ROLES = ['GUEST', 'ARTIST', 'COLLECTOR', 'ADMIN'] as const

/** Statuses that admin is allowed to set. SOLD is excluded — only the sales flow may set it. */
const ALLOWED_ADMIN_STATUSES = ['DRAFT', 'LISTED', 'IN_EXHIBITION', 'RESERVED', 'ARCHIVED'] as const

export class AdminService {
  constructor(private prisma: DbClient) {}

  async stats() {
    const [users, artists, artworks, halls, sales, artKeys] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.artist.count(),
      this.prisma.artwork.count(),
      this.prisma.exhibitionHall.count(),
      this.prisma.sale.count(),
      this.prisma.artKey.count(),
    ])
    return { users, artists, artworks, halls, sales, artKeys }
  }

  async listUsers(params: { page?: number; pageSize?: number; search?: string; role?: string }) {
    const { page = 1, pageSize = 20, search, role } = params
    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) where.role = role

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, displayName: true, role: true, avatarUrl: true,
          createdAt: true, updatedAt: true,
          artist: { select: { id: true, verified: true, tier: true } },
          collector: { select: { id: true } },
          _count: { select: { sessions: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return { users, total, page, pageSize }
  }

  async setUserRole(userId: string, role: string, changedBy: string) {
    if (!VALID_ROLES.includes(role as any)) {
      throw new ValidationError('Invalid role')
    }

    const target = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!target) throw new NotFoundError('User not found')
    if (target.role === role) return target

    // Guard: can't demote the last admin
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        throw new ForbiddenError('Cannot remove the last admin. Assign another admin first.')
      }
    }

    // Guard: can't change your own role
    if (userId === changedBy) {
      throw new ForbiddenError('Cannot change your own role.')
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    })

    // Auto-create profile when role changes to ARTIST or COLLECTOR
    if (role === 'ARTIST') {
      await this.prisma.artist.upsert({
        where: { userId },
        create: { userId, tier: 'FREE' },
        update: {},
      })
    }
    if (role === 'COLLECTOR') {
      await this.prisma.collector.upsert({
        where: { userId },
        create: { userId },
        update: {},
      })
    }

    return updated
  }

  async verifyArtist(artistId: string, verified: boolean) {
    return this.prisma.artist.update({ where: { id: artistId }, data: { verified } })
  }

  async listArtworks(params: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 20, status } = params
    const where: any = {}
    if (status) where.status = status

    const [artworks, total] = await Promise.all([
      this.prisma.artwork.findMany({
        where,
        include: { artist: { include: { user: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artwork.count({ where }),
    ])

    return { artworks, total, page, pageSize }
  }

  async setArtworkStatus(artworkId: string, status: string) {
    if (!ALLOWED_ADMIN_STATUSES.includes(status as any)) {
      throw new ValidationError(
        `Admin cannot set status '${status}'. Allowed: ${ALLOWED_ADMIN_STATUSES.join(', ')}. SOLD is set by the sales flow.`
      )
    }

    return this.prisma.artwork.update({ where: { id: artworkId }, data: { status: status as any } })
  }

  /** Soft-delete: archive the artwork. Hard deletion is forbidden via admin API. */
  async archiveArtwork(artworkId: string, force = false) {
    const artwork = await this.prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        _count: { select: { sales: true, provenanceRecords: true, artKeys: true } },
      },
    })
    if (!artwork) throw new NotFoundError('Artwork not found')

    // Block archival of sold works with provenance unless force flag is set
    if (!force && artwork._count.sales > 0) {
      throw new ForbiddenError(
        `Cannot archive: artwork has ${artwork._count.sales} sale(s). Use force=true to override (this preserves sales and provenance records).`
      )
    }

    if (!force && artwork._count.artKeys > 0) {
      throw new ForbiddenError(
        `Cannot archive: artwork has an issued Art Key. Use force=true to override (the key and provenance chain will be preserved).`
      )
    }

    // Soft-delete: set status to ARCHIVED. All related records (ArtKey, Sale, Provenance) remain intact.
    return this.prisma.artwork.update({
      where: { id: artworkId },
      data: { status: 'ARCHIVED' },
    })
  }
}

// ─── Lightweight error types (avoid pulling in full framework types) ───

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export { ValidationError, NotFoundError, ForbiddenError }
