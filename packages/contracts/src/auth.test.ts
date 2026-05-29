import { describe, expect, test } from 'bun:test'

import {
  apiErrorSchema,
  authResponseSchema,
  loginRequestSchema,
  logoutRequestSchema,
  meResponseSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  registerRequestSchema,
} from './index'

const validUser = {
  id: 'user_1',
  email: 'user@example.com',
  displayName: null,
  role: 'GUEST',
  createdAt: '2026-05-11T00:00:00.000Z',
}

describe('auth contracts', () => {
  test('normalizes registration and login input', () => {
    expect(
      registerRequestSchema.parse({
        email: ' USER@Example.COM ',
        password: 'password123',
        displayName: ' Jane ',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
      displayName: 'Jane',
    })

    expect(
      registerRequestSchema.parse({
        email: 'user@example.com',
        password: 'password123',
        displayName: '',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
      displayName: undefined,
    })

    expect(
      loginRequestSchema.parse({
        email: ' USER@Example.COM ',
        password: 'password123',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  test('rejects invalid auth request payloads', () => {
    expect(() =>
      registerRequestSchema.parse({
        email: 'not-an-email',
        password: 'short',
        displayName: 'A',
      }),
    ).toThrow()

    expect(() =>
      loginRequestSchema.parse({
        email: 'user@example.com',
        password: 'short',
      }),
    ).toThrow()
  })

  test('allows cookie-backed web refresh and explicit mobile refresh tokens', () => {
    expect(refreshRequestSchema.parse(undefined)).toEqual({})
    expect(refreshRequestSchema.parse({})).toEqual({})
    expect(logoutRequestSchema.parse(undefined)).toEqual({})
    expect(logoutRequestSchema.parse({})).toEqual({})

    const refreshToken = 'r'.repeat(32)
    expect(refreshRequestSchema.parse({ refreshToken })).toEqual({ refreshToken })
    expect(logoutRequestSchema.parse({ refreshToken })).toEqual({ refreshToken })

    expect(() => refreshRequestSchema.parse({ refreshToken: 'short' })).toThrow()
    expect(() => logoutRequestSchema.parse({ refreshToken: 'short' })).toThrow()
  })

  test('validates auth response shapes for web and mobile clients', () => {
    expect(
      authResponseSchema.parse({
        user: validUser,
        accessToken: 'access-token',
      }),
    ).toEqual({
      user: validUser,
      accessToken: 'access-token',
    })

    expect(
      authResponseSchema.parse({
        user: validUser,
        accessToken: 'access-token',
        refreshToken: 'mobile-refresh-token',
      }),
    ).toEqual({
      user: validUser,
      accessToken: 'access-token',
      refreshToken: 'mobile-refresh-token',
    })

    expect(refreshResponseSchema.parse({ accessToken: 'access-token' })).toEqual({
      accessToken: 'access-token',
    })
    expect(meResponseSchema.parse({ user: validUser })).toEqual({ user: validUser })
  })

  test('validates stable API error response shape', () => {
    expect(
      apiErrorSchema.parse({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: [{ path: ['email'], message: 'Invalid email address' }],
        },
      }),
    ).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: [{ path: ['email'], message: 'Invalid email address' }],
      },
    })

    expect(() =>
      apiErrorSchema.parse({
        error: {
          code: 'SOMETHING_ELSE',
          message: 'Nope',
        },
      }),
    ).toThrow()
  })
})
