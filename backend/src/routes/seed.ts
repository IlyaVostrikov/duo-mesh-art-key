import { Hono } from 'hono'
import { errorResponse } from '../http/errors'
import { runSeed } from '../admin/seed-db'
import type { DbClient } from '../db'

type SeedEnv = {
  Variables: {
    prisma: DbClient
  }
}

export function createSeedRoutes() {
  const routes = new Hono<SeedEnv>()

  routes.post('/seed-db', async (c) => {
    const token = c.req.header('x-seed-token') ?? c.req.query('token') ?? ''
    if (!token || token !== process.env.SEED_TOKEN) {
      return c.json(errorResponse('UNAUTHORIZED', 'Invalid or missing seed token'), 401)
    }
    const prisma = c.get('prisma')
    const result = await runSeed(prisma)
    return c.json(result)
  })

  return routes
}
