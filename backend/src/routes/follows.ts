import { Hono } from 'hono'
import { authGuard, getAuthUser, optionalAuth } from '../guards/auth'
import type { DbClient } from '../db'

type FollowRouteEnv = {
  Variables: {
    prisma: DbClient
  }
}

export function createFollowRoutes() {
  const routes = new Hono<FollowRouteEnv>()

  // Follow an artist
  routes.post('/:artistId', authGuard(), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)
    const artistId = c.req.param('artistId')

    // Check artist exists
    const artist = await prisma.artist.findUnique({ where: { id: artistId } })
    if (!artist) return c.json({ error: 'NOT_FOUND', message: 'Artist not found' }, 404)

    // Upsert follow
    await prisma.follow.upsert({
      where: { followerId_artistId: { followerId: authUser!.userId, artistId } },
      create: { followerId: authUser!.userId, artistId },
      update: {},
    })

    const count = await prisma.follow.count({ where: { artistId } })
    return c.json({ isFollowing: true, followersCount: count })
  })

  // Unfollow an artist
  routes.delete('/:artistId', authGuard(), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)
    const artistId = c.req.param('artistId')

    await prisma.follow.deleteMany({
      where: { followerId: authUser!.userId, artistId },
    })

    const count = await prisma.follow.count({ where: { artistId } })
    return c.json({ isFollowing: false, followersCount: count })
  })

  // Check follow status
  routes.get('/:artistId', optionalAuth(), async (c) => {
    const prisma = c.get('prisma')
    const authUser = getAuthUser(c)
    const artistId = c.req.param('artistId')

    const count = await prisma.follow.count({ where: { artistId } })
    let isFollowing = false
    if (authUser) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_artistId: { followerId: authUser.userId, artistId } },
      })
      isFollowing = !!follow
    }

    return c.json({ isFollowing, followersCount: count })
  })

  return routes
}
