import type { DbClient } from '../db'
import { NotFoundError } from '../http/errors'

export class FollowService {
  constructor(private prisma: DbClient) {}

  async followArtist(userId: string, artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId } })
    if (!artist) throw new NotFoundError('Artist not found')

    await this.prisma.follow.upsert({
      where: { followerId_artistId: { followerId: userId, artistId } },
      create: { followerId: userId, artistId },
      update: {},
    })

    const count = await this.prisma.follow.count({ where: { artistId } })
    return { isFollowing: true, followersCount: count }
  }

  async unfollowArtist(userId: string, artistId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId: userId, artistId },
    })

    const count = await this.prisma.follow.count({ where: { artistId } })
    return { isFollowing: false, followersCount: count }
  }

  async getFollowStatus(artistId: string, userId?: string) {
    const count = await this.prisma.follow.count({ where: { artistId } })
    let isFollowing = false
    if (userId) {
      const follow = await this.prisma.follow.findUnique({
        where: { followerId_artistId: { followerId: userId, artistId } },
      })
      isFollowing = !!follow
    }
    return { isFollowing, followersCount: count }
  }
}
