import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

const isVercel = Boolean(process.env.VERCEL)

// Bun-only: serveStatic for local uploads; on Vercel, uploads go via S3/Spaces
let serveStatic: typeof import('hono/bun').serveStatic | null = null
if (!isVercel) {
  try {
    const bunMod = await import('hono/bun')
    serveStatic = bunMod.serveStatic
  } catch {
    // hono/bun not available; local upload serving disabled
  }
}

import type { DbClient } from './db'
import type { AppEnv } from './env'
import { createAuthRoutes } from './auth/routes'
import { AuthService } from './auth/service'
import { errorResponse, handleError, validationErrorHook } from './http/errors'
import { rateLimiter } from './http/rate-limiter'
import { createStorageServiceFromEnv, type StorageService } from './storage/service'
import { KeyStore } from './crypto/keystore'
import { SigningService } from './services/signing.service'
import { ArtistService } from './services/artist.service'
import { ArtworkService } from './services/artwork.service'
import { HallService } from './services/hall.service'
import { ArtKeyService } from './services/art-key.service'
import { FeaturedService } from './services/featured.service'
import { AdminService } from './services/admin.service'
import { SaleService } from './services/sale.service'
import { FollowService } from './services/follow.service'
import { CollectionService } from './services/collection.service'
import { InquiryService } from './services/inquiry.service'
import { UploadService } from './services/upload.service'
import { ProvenanceTransferService } from './services/provenance-transfer.service'
import { createArtistRoutes } from './routes/artists'
import { createArtworkRoutes } from './routes/artworks'
import { createHallRoutes } from './routes/halls'
import { createArtKeyRoutes } from './routes/art-keys'
import { createFollowRoutes } from './routes/follows'
import { createCollectionRoutes } from './routes/collection'
import { createSearchRoutes } from './routes/search'
import { createInquiryRoutes } from './routes/inquiries'
import { createUploadRoutes } from './routes/uploads'
import { createFeaturedRoutes } from './routes/featured'
import { createSalesRoutes } from './routes/sales'
import { createAdminRoutes } from './routes/admin'
import { createSeedRoutes } from './routes/seed'
import { createPublicKeyRoutes } from './routes/public-keys'
import { createTransferRoutes } from './routes/transfers'
import { createPurchaseRoutes } from './routes/purchase'
import { TransparencyLogService } from './services/transparency-log.service'
import { createTransparencyRoutes } from './routes/transparency'
import { createKdfMigrationRoutes } from './routes/kdf-migration'

type AppBindings = {
  Variables: {
    authService: AuthService
    artistService: ArtistService
    artworkService: ArtworkService
    hallService: HallService
    artKeyService: ArtKeyService
    featuredService: FeaturedService
    adminService: AdminService
    saleService: SaleService
    followService: FollowService
    collectionService: CollectionService
    inquiryService: InquiryService
    uploadService: UploadService
    signingService: SigningService
    provenanceTransferService: ProvenanceTransferService
    transparencyLogService: TransparencyLogService
    env: AppEnv
    prisma: DbClient
    storageService: StorageService | null
  }
}

type CreateAppOptions = {
  env: AppEnv
  prisma: DbClient
}

function resolveDataDir(): string {
  if (isVercel) return resolve('/tmp', 'duo-mesh-data')
  // Bun: import.meta.dir; Node.js: derive from import.meta.url
  const baseDir = typeof import.meta.dir !== 'undefined'
    ? import.meta.dir
    : resolve(fileURLToPath(import.meta.url), '../..')
  return resolve(baseDir, '../data')
}

export async function createApp({ env, prisma }: CreateAppOptions) {
  // ── Crypto infra ──
  const dataDir = env.DATA_DIR ?? resolveDataDir()
  mkdirSync(dataDir, { recursive: true })

  const keyStore = new KeyStore(
    resolve(dataDir, 'keystore.json'),
    env.SECRET_STORE_KEY,
    process.env.KEYSTORE_SALT,
  )
  const signingService = new SigningService(prisma, keyStore)

  // ── Services ──
  const authService = new AuthService(prisma, env)
  const artistService = new ArtistService(prisma, signingService)
  const artworkService = new ArtworkService(prisma, signingService)
  const hallService = new HallService(prisma)
  const artKeyService = new ArtKeyService(prisma, signingService, env.TSA_URL)
  const featuredService = new FeaturedService(prisma)
  const adminService = new AdminService(prisma)
  const saleService = new SaleService(prisma)
  const followService = new FollowService(prisma)
  const collectionService = new CollectionService(prisma)
  const inquiryService = new InquiryService(prisma)
  const transparencyLogService = new TransparencyLogService(prisma)
  const storageService = createStorageServiceFromEnv(env)
  const uploadService = new UploadService({
    maxImageBytes: env.UPLOAD_MAX_IMAGE_BYTES,
    max3DBytes: env.UPLOAD_MAX_3D_BYTES,
    storage: storageService,
    baseDir: isVercel ? '/tmp/uploads' : 'uploads',
  })
  const provenanceTransferService = new ProvenanceTransferService(prisma, signingService)

  // ── Bootstrap: ensure platform key exists & sync keys from DB ──
  // MUST await — the migration and key sync must complete before any request
  // touches the signing_keys table (Prisma queries fail if columns are missing).
  try {
    await signingService.ensureKeys()
  } catch (err) {
    console.error('Failed to ensure keys:', err)
  }

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
    c.set('adminService', adminService)
    c.set('saleService', saleService)
    c.set('followService', followService)
    c.set('collectionService', collectionService)
    c.set('inquiryService', inquiryService)
    c.set('transparencyLogService', transparencyLogService)
    c.set('uploadService', uploadService)
    c.set('signingService', signingService)
    c.set('provenanceTransferService', provenanceTransferService)
    c.set('env', env)
    c.set('prisma', prisma)
    c.set('storageService', storageService)
    await next()
  })

  app.get('/', (c) => c.json({ name: 'DUO MESH API', status: 'ok' }))
  app.get('/health', (c) => c.json({ status: 'ok' }))

  // Allow cross-origin loading of uploaded assets (overrides secureHeaders CORP: same-origin)
  // On Vercel, uploads are served from /tmp; locally via Bun serveStatic
  app.use('/uploads/*', async (c, next) => {
    c.res.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    await next()
  })
  if (serveStatic) {
    app.use('/uploads/*', serveStatic({ root: './' }))
  } else if (isVercel) {
    app.get('/uploads/*', async (c) => {
      const { readFile } = await import('node:fs/promises')
      // c.req.path is e.g. /uploads/... inside the /api-mounted app
      const filePath = resolve('/tmp', c.req.path.replace(/^\//, ''))
      try {
        const data = await readFile(filePath)
        const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif',
          glb: 'model/gltf-binary', gltf: 'model/gltf+json',
          bin: 'application/octet-stream', hdr: 'image/vnd.radiance',
        }
        return c.body(data, 200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' })
      } catch {
        // File not on /tmp (cold start) — redirect to S3 public URL if storage is configured.
        // The S3 key is the request path without the leading slash:
        //   /uploads/user/date/uuid-name → uploads/user/date/uuid-name
        if (storageService) {
          try {
            const s3Key = c.req.path.replace(/^(?:\/api)?\//, '')
            const { downloadUrl } = await storageService.createDownloadUrl({ key: s3Key })
            return c.redirect(downloadUrl, 302)
          } catch { /* S3 lookup failed — fall through to 404 */ }
        }
        return c.json({ error: 'NOT_FOUND', message: 'File not found' }, 404)
      }
    })
  }

  // Rate limit auth endpoints against brute-force (production only).
  // Paths match the Hono-internal mount point (/auth), not the Vercel-level /api prefix.
  app.use(
    '/auth/login',
    rateLimiter({ windowMs: 60_000, max: 10, message: 'Too many login attempts. Please try again later.', enabled: env.NODE_ENV === 'production' }),
  )
  app.use(
    '/auth/register',
    rateLimiter({ windowMs: 60_000, max: 5, message: 'Too many registration attempts. Please try again later.', enabled: env.NODE_ENV === 'production' }),
  )
  app.use(
    '/auth/refresh',
    rateLimiter({ windowMs: 60_000, max: 20, message: 'Too many refresh attempts.', enabled: env.NODE_ENV === 'production' }),
  )

  // Rate limit public inquiry creation against spam
  app.use(
    '/inquiries',
    rateLimiter({ windowMs: 60_000, max: 3, message: 'Too many inquiries. Please try again later.', enabled: env.NODE_ENV === 'production' }),
  )

  // Mount routes
  app.route('/auth', createAuthRoutes())
  app.route('/artists', createArtistRoutes())
  app.route('/artworks', createArtworkRoutes())
  app.route('/halls', createHallRoutes())
  app.route('/art-keys', createArtKeyRoutes())
  app.route('/follows', createFollowRoutes())
  app.route('/collection', createCollectionRoutes())
  app.route('/search', createSearchRoutes())
  app.route('/inquiries', createInquiryRoutes())
  app.route('/uploads', createUploadRoutes())
  app.route('/featured', createFeaturedRoutes())
  app.route('/sales', createSalesRoutes())
  app.route('/admin', createAdminRoutes())
  app.route('/seed', createSeedRoutes())
  app.route('/', createKdfMigrationRoutes())
  app.route('/public-keys', createPublicKeyRoutes())
  app.route('/', createTransferRoutes())
  app.route('/', createPurchaseRoutes())
  app.route('/transparency', createTransparencyRoutes())

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'DUO MESH API', version: '0.1.0' },
  })

  app.notFound((c) => c.json(errorResponse('NOT_FOUND', 'Route not found'), 404))

  app.onError(handleError)

  return app
}

export type AppType = Awaited<ReturnType<typeof createApp>>
