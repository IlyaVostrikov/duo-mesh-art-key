import { Hono } from 'hono'
import { authGuard, getAuthUser, optionalAuth } from '../guards/auth'
import type { FollowService } from '../services/follow.service'
import type { ArtistService } from '../services/artist.service'

type FollowRouteEnv = {
  Variables: {
    followService: FollowService
    artistService: ArtistService
  }
}

export function createFollowRoutes() {
  const routes = new Hono<FollowRouteEnv>()

  routes.get('/', authGuard(), async (c) => {
    const svc = c.get('artistService')
    const authUser = getAuthUser(c)!
    const artists = await svc.getFollowing(authUser.userId)
    return c.json({ artists, total: artists.length })
  })

  routes.post('/:artistId', authGuard(), async (c) => {
    const svc = c.get('followService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.followArtist(authUser.userId, c.req.param('artistId')))
  })

  routes.delete('/:artistId', authGuard(), async (c) => {
    const svc = c.get('followService')
    const authUser = getAuthUser(c)!
    return c.json(await svc.unfollowArtist(authUser.userId, c.req.param('artistId')))
  })

  routes.get('/:artistId', optionalAuth(), async (c) => {
    const svc = c.get('followService')
    const authUser = getAuthUser(c)
    return c.json(await svc.getFollowStatus(c.req.param('artistId'), authUser?.userId))
  })

  return routes
}
