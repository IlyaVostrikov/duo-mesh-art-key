import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import { loadEnv } from './env'

describe('loadEnv', () => {
  test('parses defaults and comma-separated origins', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
      JWT_SECRET: '12345678901234567890123456789012',
      CORS_ORIGINS: 'http://localhost:5173, http://localhost:8081',
    })

    expect(env.PORT).toBe(3000)
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900)
    expect(env.COOKIE_SECURE).toBe(false)
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://localhost:8081'])
    expect(env.SPACES_REGION).toBeUndefined()
    expect(env.SPACES_UPLOAD_MAX_BYTES).toBe(10 * 1024 * 1024)
    expect(env.SPACES_UPLOAD_URL_TTL_SECONDS).toBe(900)
    expect(env.SPACES_DOWNLOAD_URL_TTL_SECONDS).toBe(300)
    expect(env.SPACES_PUBLIC_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
    expect(env.APPLE_IAP_ENVIRONMENT).toBe('Sandbox')
    expect(env.APPLE_IAP_PRODUCT_IDS).toEqual([])
  })

  test('parses backend .env.example with optional blank App Store fields', () => {
    const env = loadEnv(parseEnvExample())

    expect(env.APPLE_IAP_BUNDLE_ID).toBeUndefined()
    expect(env.APPLE_IAP_APP_APPLE_ID).toBeUndefined()
    expect(env.APPLE_IAP_ISSUER_ID).toBeUndefined()
    expect(env.APPLE_IAP_PRODUCT_IDS).toEqual([
      'com.example.app.premium.monthly',
      'com.example.app.premium.yearly',
    ])
  })

  test('requires complete DigitalOcean Spaces configuration when storage is enabled', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
        JWT_SECRET: '12345678901234567890123456789012',
        SPACES_BUCKET: 'uploads',
      }),
    ).toThrow()
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
        JWT_SECRET: '12345678901234567890123456789012',
        SPACES_CDN_BASE_URL: 'https://images.example.com',
      }),
    ).toThrow()

    const env = loadEnv({
      DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
      JWT_SECRET: '12345678901234567890123456789012',
      SPACES_REGION: 'nyc3',
      SPACES_BUCKET: 'uploads',
      SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
      SPACES_CDN_BASE_URL: 'https://images.example.com',
      SPACES_ACCESS_KEY_ID: 'access-key',
      SPACES_SECRET_ACCESS_KEY: 'secret-key',
    })

    expect(env.SPACES_REGION).toBe('nyc3')
    expect(env.SPACES_BUCKET).toBe('uploads')
    expect(env.SPACES_CDN_BASE_URL).toBe('https://images.example.com')
  })

  test('rejects known weak JWT secrets in production-like runtimes', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
        JWT_SECRET: 'replace-with-at-least-32-random-characters',
      }),
    ).toThrow('JWT_SECRET')

    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
        JWT_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        COOKIE_SECURE: 'true',
        CORS_ORIGINS: 'https://web.example.com',
      }),
    ).toThrow('JWT_SECRET')
  })

  test('rejects unsafe production CORS origins', () => {
    const baseEnv = {
      DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
      JWT_SECRET: '12345678901234567890123456789012',
    }

    expect(() =>
      loadEnv({
        ...baseEnv,
        CORS_ORIGINS: '',
      }),
    ).toThrow('CORS_ORIGINS')

    expect(() =>
      loadEnv({
        ...baseEnv,
        CORS_ORIGINS: '*',
      }),
    ).toThrow('CORS_ORIGINS')

    expect(() =>
      loadEnv({
        ...baseEnv,
        CORS_ORIGINS: 'https://web.example.com/path',
      }),
    ).toThrow('CORS_ORIGINS')

    expect(() =>
      loadEnv({
        ...baseEnv,
        COOKIE_SECURE: 'true',
        CORS_ORIGINS: 'http://web.example.com',
      }),
    ).toThrow('CORS_ORIGINS')
  })

  test('requires complete App Store IAP verification config when enabled', () => {
    const baseEnv = {
      DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
      JWT_SECRET: '12345678901234567890123456789012',
    }

    expect(() =>
      loadEnv({
        ...baseEnv,
        APPLE_IAP_BUNDLE_ID: 'com.example.app',
      }),
    ).toThrow('APPLE_IAP_ISSUER_ID')

    expect(() =>
      loadEnv({
        ...baseEnv,
        APPLE_IAP_BUNDLE_ID: 'com.example.app',
        APPLE_IAP_ENVIRONMENT: 'Production',
        APPLE_IAP_ISSUER_ID: 'issuer-id',
        APPLE_IAP_KEY_ID: 'key-id',
        APPLE_IAP_PRIVATE_KEY_BASE64: 'private-key',
      }),
    ).toThrow('APPLE_IAP_APP_APPLE_ID')

    expect(() =>
      loadEnv({
        ...baseEnv,
        APPLE_IAP_BUNDLE_ID: 'com.example.app',
        APPLE_IAP_ISSUER_ID: 'issuer-id',
        APPLE_IAP_KEY_ID: 'key-id',
        APPLE_IAP_PRIVATE_KEY_BASE64: 'private-key',
      }),
    ).toThrow('APPLE_IAP_PRODUCT_IDS')

    const env = loadEnv({
      ...baseEnv,
      APPLE_IAP_BUNDLE_ID: 'com.example.app',
      APPLE_IAP_ISSUER_ID: 'issuer-id',
      APPLE_IAP_KEY_ID: 'key-id',
      APPLE_IAP_PRIVATE_KEY_BASE64: 'private-key',
      APPLE_IAP_PRODUCT_IDS: 'premium_monthly, premium_yearly',
    })

    expect(env.APPLE_IAP_PRODUCT_IDS).toEqual(['premium_monthly', 'premium_yearly'])
  })
})

function parseEnvExample() {
  const contents = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  const values: Record<string, string> = {}

  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex)
    const rawValue = trimmed.slice(separatorIndex + 1)
    values[key] = rawValue.replace(/^"(.*)"$/, '$1')
  }

  return values
}
