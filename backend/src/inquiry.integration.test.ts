import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from './app'
import { createPrisma } from './db'
import type { AppEnv } from './env'

const databaseUrl = process.env.TEST_DATABASE_URL

const maybeDescribe = databaseUrl ? describe : describe.skip

maybeDescribe('contact-artist inquiry loop', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'duo-mesh-test-'))

  const env: AppEnv = {
    PORT: 3000,
    DATABASE_URL: databaseUrl!,
    JWT_SECRET: '12345678901234567890123456789012',
    CORS_ORIGINS: ['http://localhost:5173'],
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
    COOKIE_SECURE: false,
    UPLOAD_MAX_3D_BYTES: 100 * 1024 * 1024,
    UPLOAD_MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    SPACES_UPLOAD_MAX_BYTES: 10 * 1024 * 1024,
    SPACES_UPLOAD_URL_TTL_SECONDS: 900,
    SPACES_DOWNLOAD_URL_TTL_SECONDS: 300,
    SPACES_PUBLIC_CACHE_CONTROL: 'public, max-age=31536000, immutable',
    SECRET_STORE_KEY: 'test-secret-store-key-32-chars-min!!!',
    DATA_DIR: dataDir,
  }
  const prisma = createPrisma(databaseUrl!)
  let app: Awaited<ReturnType<typeof createApp>>

  beforeAll(async () => {
    app = await createApp({ env, prisma })
  })

  let artistUserId: string
  let artistId: string
  let artworkId: string
  let accessToken: string

  beforeEach(async () => {
    // Clean existing data
    await prisma.notification.deleteMany()
    await prisma.inquiry.deleteMany()
    await prisma.artwork.deleteMany()
    await prisma.exhibitionHall.deleteMany()
    await prisma.artist.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()

    // Register artist user
    const register = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'artist@test.dev',
        password: 'password123',
        displayName: 'Test Artist',
      }),
    })
    const regBody = await register.json()
    expect(register.status).toBe(201)
    accessToken = regBody.accessToken
    artistUserId = regBody.user.id

    // Create artist profile
    const artist = await prisma.artist.create({
      data: { userId: artistUserId },
    })

    // Set user role to ARTIST
    await prisma.user.update({
      where: { id: artistUserId },
      data: { role: 'ARTIST' },
    })

    artistId = artist.id

    // Create artwork
    const artwork = await prisma.artwork.create({
      data: {
        artistId,
        title: 'Test Artwork',
        posterUrl: '/assets/test.jpg',
        images: [],
        styleTags: [],
        status: 'LISTED',
      },
    })
    artworkId = artwork.id
  })

  afterAll(async () => {
    await prisma.notification.deleteMany()
    await prisma.inquiry.deleteMany()
    await prisma.artwork.deleteMany()
    await prisma.exhibitionHall.deleteMany()
    await prisma.artist.deleteMany()
    await prisma.authSession.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
    rmSync(dataDir, { recursive: true, force: true })
  })

  test('полный путь: submit → Inquiry → Notification → dashboard', async () => {
    // [2][3] Анонимный посетитель отправляет inquiry
    const res = await app.request('/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        fromName: 'Collector A',
        fromEmail: 'a@test.dev',
        message: 'Interested in this piece',
      }),
    })
    expect(res.status).toBe(201)

    // [3] Inquiry реально в БД
    const inq = await prisma.inquiry.findFirst({ where: { artworkId } })
    expect(inq).not.toBeNull()
    expect(inq!.message).toBe('Interested in this piece')

    // [4] Notification создана и адресована художнику (его userId, НЕ artist.id)
    const notif = await prisma.notification.findFirst({
      where: { userId: artistUserId, type: 'INQUIRY_RECEIVED' },
    })
    expect(notif).not.toBeNull()
    expect(notif!.userId).toBe(artistUserId)

    // [5] Dashboard художника видит inquiry
    const dash = await app.request('/inquiries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(dash.status).toBe(200)
    const body = await dash.json()
    const inquiryIds = body.map((i: any) => i.id)
    expect(inquiryIds).toContain(inq!.id)
  })
})
