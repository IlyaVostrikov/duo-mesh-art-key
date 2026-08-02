import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { errorResponse } from '../http/errors'
import { rateLimiter } from '../http/rate-limiter'
import { runSeed } from '../admin/seed-db'
import type { DbClient } from '../db'

type SeedEnv = {
  Variables: {
    prisma: DbClient
  }
}

export function createSeedRoutes() {
  const routes = new Hono<SeedEnv>()

  routes.post(
    '/seed-db',
    rateLimiter({ windowMs: 60_000, max: 3, message: 'Too many seed requests.' }),
    async (c) => {
      const token = c.req.header('x-seed-token') ?? ''
      const expected = process.env.SEED_TOKEN ?? ''

      // Constant-time comparison via SHA-256 hashing to avoid length-based
      // timing leaks. Always compute both hashes so the code path is identical
      // whether SEED_TOKEN is configured or not.
      const expectedHash = createHash('sha256').update(expected).digest()
      const actualHash = createHash('sha256').update(token).digest()

      if (!expected || !token || !timingSafeEqual(expectedHash, actualHash)) {
        return c.json(errorResponse('UNAUTHORIZED', 'Invalid or missing seed token'), 401)
      }

      const prisma = c.get('prisma')
      const result = await runSeed(prisma)
      return c.json(result)
    },
  )

  return routes
}
