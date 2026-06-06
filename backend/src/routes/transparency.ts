import { Hono } from 'hono'
import { z } from 'zod'
import type { TransparencyLogService } from '../services/transparency-log.service'
import type { ArtKeyService } from '../services/art-key.service'

type TransparencyRouteEnv = {
  Variables: {
    transparencyLogService: TransparencyLogService
    artKeyService: ArtKeyService
  }
}

const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export function createTransparencyRoutes() {
  const routes = new Hono<TransparencyRouteEnv>()

  // Public: get transparency log for a specific ArtKey
  routes.get('/transparency/:keyCode', async (c) => {
    const tls = c.get('transparencyLogService')
    const artKeySvc = c.get('artKeyService')

    const verification = await artKeySvc.verify(c.req.param('keyCode'))
    if (!verification) {
      return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    }

    const entries = await tls.getByArtKey(verification.artKey.id)
    const integrity = await tls.verify(verification.artKey.id)

    return c.json({
      keyCode: verification.artKey.keyCode,
      entries: entries.map((e) => ({
        sequence: e.sequence,
        entryType: e.entryType,
        entryHash: e.entryHash,
        prevEntryHash: e.prevEntryHash,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
      integrity,
    })
  })

  // Public: get global transparency log (all ArtKeys)
  routes.get('/transparency', async (c) => {
    const tls = c.get('transparencyLogService')
    const parsed = pageSchema.safeParse(c.req.query())
    const { page, pageSize } = parsed.success ? parsed.data : { page: 1, pageSize: 50 }

    const result = await tls.getGlobal(page, pageSize)
    return c.json({
      ...result,
      entries: result.entries.map((e) => ({
        sequence: e.sequence,
        entryType: e.entryType,
        entryHash: e.entryHash,
        prevEntryHash: e.prevEntryHash,
        keyCode: e.artKey.keyCode,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  })

  return routes
}
