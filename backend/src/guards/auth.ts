import type { Context, MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'
import { errorResponse } from '../http/errors'

const BEARER_RE = /^Bearer\s+(.+)$/i

export interface AuthUser {
  userId: string
  role: string
  sessionId: string
}

type AuthServiceDep = { verifyAccessToken: (token: string) => Promise<AuthUser | null> }

export function getAuthUser(c: Context): AuthUser | null {
  return (c.get('authUser') as AuthUser) ?? null
}

export function requireAuth(c: Context): AuthUser {
  const user = getAuthUser(c)
  if (!user) {
    throw { status: 401, body: errorResponse('UNAUTHORIZED', 'Authentication required') }
  }
  return user
}

export function optionalAuth(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization')
    if (!header) return await next()

    const match = BEARER_RE.exec(header)
    if (!match?.[1]) return await next()

    try {
      const authService = c.get('authService') as AuthServiceDep
      const user = await authService.verifyAccessToken(match[1])
      if (user) c.set('authUser', user)
    } catch (err) {
      // Log unexpected errors (DB down, etc.) but continue as guest for invalid tokens
      if (!(err instanceof Error) || !err.message.includes('token')) {
        console.error('[optionalAuth] token verification error:', err)
      }
    }

    await next()
  })
}

export function authGuard(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization')
    if (!header) {
      return c.json(errorResponse('UNAUTHORIZED', 'Missing Authorization header'), 401)
    }

    const match = BEARER_RE.exec(header)
    if (!match?.[1]) {
      return c.json(errorResponse('UNAUTHORIZED', 'Invalid Authorization header format'), 401)
    }

    const authService = c.get('authService') as AuthServiceDep
    const user = await authService.verifyAccessToken(match[1])
    if (!user) {
      return c.json(errorResponse('UNAUTHORIZED', 'Invalid or expired access token'), 401)
    }

    c.set('authUser', user)
    await next()
  })
}

export function requireRole(...roles: string[]): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const user = getAuthUser(c)
    if (!user) {
      return c.json(errorResponse('UNAUTHORIZED', 'Authentication required'), 401)
    }
    if (!roles.includes(user.role)) {
      return c.json(errorResponse('FORBIDDEN', 'Insufficient permissions'), 403)
    }
    await next()
  })
}
