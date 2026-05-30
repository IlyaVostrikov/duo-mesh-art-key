import type {
  LoginRequest,
  RegisterPayload,
  UserDto,
} from '@duo-mesh/contracts'

import type { DbClient } from '../db'
import type { AppEnv } from '../env'
import { AppError } from '../http/errors'
import { Prisma } from '../generated/prisma/client'
import { signAccessToken, verifyAccessToken } from './access-tokens'
import { hashPassword, verifyPassword } from './passwords'
import { createRefreshToken, hashRefreshToken } from './refresh-tokens'

type SessionMetadata = {
  userAgent?: string
  ipAddress?: string
}

type UserRecord = {
  id: string
  email: string
  displayName: string | null
  role?: string
  createdAt: Date
}

export class AuthService {
  constructor(
    private readonly db: DbClient,
    private readonly env: AppEnv,
  ) {}

  async register(input: RegisterPayload, metadata: SessionMetadata) {
    const existingUser = await this.db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })

    if (existingUser) {
      throw new AppError(409, 'CONFLICT', 'User with this email already exists')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await this.db.user
      .create({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          role: input.role,
        },
      })
      .catch((error: unknown) => {
        if (isUniqueConstraintError(error)) {
          throw new AppError(409, 'CONFLICT', 'User with this email already exists')
        }

        throw error
      })

    return this.issueSession(user, metadata)
  }

  async login(input: LoginRequest, metadata: SessionMetadata) {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    })

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password')
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash)
    if (!passwordMatches) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password')
    }

    return this.issueSession(user, metadata)
  }

  async refresh(refreshToken: string | undefined, metadata: SessionMetadata) {
    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is required')
    }

    const refreshTokenHash = hashRefreshToken(refreshToken)
    const now = new Date()
    const currentSession = await this.db.authSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
    })

    if (!currentSession) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh session is invalid or expired')
    }

    const nextRefreshToken = createRefreshToken()
    const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken)
    const expiresAt = this.refreshExpiresAt()

    const nextSession = await this.db.$transaction(async (tx) => {
      const revokeResult = await tx.authSession.updateMany({
        where: {
          id: currentSession.id,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: { revokedAt: now },
      })

      if (revokeResult.count !== 1) {
        throw new AppError(401, 'UNAUTHORIZED', 'Refresh session is invalid or expired')
      }

      return tx.authSession.create({
        data: {
          userId: currentSession.userId,
          refreshTokenHash: nextRefreshTokenHash,
          expiresAt,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
        },
      })
    })

    const accessToken = await signAccessToken(
      {
        sub: currentSession.user.id,
        email: currentSession.user.email,
        sessionId: nextSession.id,
      },
      this.env,
    )

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    }
  }

  async verifyAccessToken(token: string) {
    const payload = await verifyAccessToken(token, this.env)
    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    })
    if (!user) return null
    return { userId: user.id, role: user.role, sessionId: payload.sessionId }
  }

  async getMe(accessToken: string | undefined) {
    if (!accessToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is required')
    }

    const payload = await verifyAccessToken(accessToken, this.env).catch(() => {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is invalid or expired')
    })

    const session = await this.db.authSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    })

    if (!session) {
      throw new AppError(401, 'UNAUTHORIZED', 'Session is invalid or expired')
    }

    return {
      user: toUserDto(session.user),
    }
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return

    await this.db.authSession.updateMany({
      where: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  private async issueSession(user: UserRecord, metadata: SessionMetadata) {
    const refreshToken = createRefreshToken()
    const session = await this.db.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: this.refreshExpiresAt(),
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    })

    const accessToken = await signAccessToken(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.id,
      },
      this.env,
    )

    return {
      user: toUserDto(user),
      accessToken,
      refreshToken,
    }
  }

  private refreshExpiresAt() {
    return new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function toUserDto(user: UserRecord & { role?: string }): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: (user as any).role ?? 'GUEST',
    createdAt: user.createdAt.toISOString(),
  }
}
