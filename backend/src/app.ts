import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import type { DbClient } from './db'
import type { AppEnv } from './env'
import { createAuthRoutes } from './auth/routes'
import { AuthService } from './auth/service'
import { errorResponse, handleError, validationErrorHook } from './http/errors'
import { createStorageServiceFromEnv, type StorageService } from './storage/service'
import { ArtistService } from './services/artist.service'
import { ArtworkService } from './services/artwork.service'
import { HallService } from './services/hall.service'
import { ArtKeyService } from './services/art-key.service'
import { FeaturedService } from './services/featured.service'
import { createArtistRoutes } from './routes/artists'
import { createArtworkRoutes } from './routes/artworks'
import { createHallRoutes } from './routes/halls'
import { createArtKeyRoutes } from './routes/art-keys'
import { createFollowRoutes } from './routes/follows'
import { createSearchRoutes } from './routes/search'
import { createInquiryRoutes } from './routes/inquiries'
import { createUploadRoutes } from './routes/uploads'
import { createFeaturedRoutes } from './routes/featured'

type AppBindings = {
  Variables: {
    authService: AuthService
    artistService: ArtistService
    artworkService: ArtworkService
    hallService: HallService
    artKeyService: ArtKeyService
    featuredService: FeaturedService
    env: AppEnv
    prisma: DbClient
    storageService: StorageService | null
  }
}

type CreateAppOptions = {
  env: AppEnv
  prisma: DbClient
}

export function createApp({ env, prisma }: CreateAppOptions) {
  const authService = new AuthService(prisma, env)
  const artistService = new ArtistService(prisma)
  const artworkService = new ArtworkService(prisma)
  const hallService = new HallService(prisma)
  const artKeyService = new ArtKeyService(prisma)
  const featuredService = new FeaturedService(prisma)
  const storageService = createStorageServiceFromEnv(env)

  const app = new OpenAPIHono<AppBindings>({
    defaultHook: validationErrorHook,
  })

  app.use(secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return env.CORS_ORIGINS[0] ?? null
        return env.CORS_ORIGINS.includes(origin) ? origin : null
      },
      allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      maxAge: 600,
    }),
  )
  app.use('*', async (c, next) => {
    c.set('authService', authService)
    c.set('artistService', artistService)
    c.set('artworkService', artworkService)
    c.set('hallService', hallService)
    c.set('artKeyService', artKeyService)
    c.set('featuredService', featuredService)
    c.set('env', env)
    c.set('prisma', prisma)
    c.set('storageService', storageService)
    await next()
  })

  app.get('/', (c) => c.json({ name: 'DUO MESH API', status: 'ok' }))
  app.get('/health', (c) => c.json({ status: 'ok' }))

  // Allow cross-origin loading of uploaded assets (overrides secureHeaders CORP: same-origin)
  app.use('/uploads/*', async (c, next) => {
    c.res.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    await next()
  })
  app.use('/uploads/*', serveStatic({ root: './' }))

  // Mount routes
  app.route('/api/auth', createAuthRoutes())
  app.route('/api/artists', createArtistRoutes())
  app.route('/api/artworks', createArtworkRoutes())
  app.route('/api/halls', createHallRoutes())
  app.route('/api/art-keys', createArtKeyRoutes())
  app.route('/api/follows', createFollowRoutes())
  app.route('/api/search', createSearchRoutes())
  app.route('/api/inquiries', createInquiryRoutes())
  app.route('/api/uploads', createUploadRoutes())
  app.route('/api/featured', createFeaturedRoutes())

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'DUO MESH API', version: '0.1.0' },
  })

  app.notFound((c) => c.json(errorResponse('NOT_FOUND', 'Route not found'), 404))
  app.onError(handleError)

  return app
}

export type AppType = ReturnType<typeof createApp>
