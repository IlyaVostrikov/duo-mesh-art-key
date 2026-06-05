import type { MiddlewareHandler } from 'hono'
import { errorResponse } from './errors'

interface RateLimitStore {
  [ip: string]: { count: number; resetAt: number }
}

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  /** Disables rate limiting entirely — off in dev/test, on in production. */
  enabled?: boolean
}

/** Simple in-memory sliding-window rate limiter. Resets on server restart. */
export function rateLimiter(options: RateLimitOptions): MiddlewareHandler {
  if (options.enabled === false) return async (_c, next) => next()

  const store: RateLimitStore = {}
  const { windowMs, max, message = 'Too many requests' } = options

  // Clean up expired entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const ip of Object.keys(store)) {
      if (store[ip].resetAt <= now) delete store[ip]
    }
  }, windowMs).unref()

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      '127.0.0.1'

    const now = Date.now()
    const entry = store[ip]

    if (!entry || entry.resetAt <= now) {
      store[ip] = { count: 1, resetAt: now + windowMs }
      return next()
    }

    entry.count++

    if (entry.count > max) {
      return c.json(errorResponse('RATE_LIMITED', message), 429)
    }

    return next()
  }
}
