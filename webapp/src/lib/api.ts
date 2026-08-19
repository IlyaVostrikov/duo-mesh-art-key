import {
  apiErrorSchema,
  authResponseSchema,
  loginRequestSchema,
  logoutRequestSchema,
  meResponseSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  registerRequestSchema,
  saveArtworkResponseSchema,
  savedArtworkListSchema,
  savedIdsSchema,
  type AuthResponse,
  type LoginRequest,
  type LogoutRequest,
  type MeResponse,
  type RefreshRequest,
  type RefreshResponse,
  type RegisterRequest,
  type SaveArtworkResponse,
  type SavedArtworkListDto,
  type SavedIdsDto,
} from '@duo-mesh/contracts'
import type { z } from 'zod'

export const apiBaseUrl = (import.meta.env?.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

type ApiClientOptions = {
  getAccessToken: () => string | null
  setAccessToken: (accessToken: string | null) => void
  onAuthExpired?: () => void | Promise<void>
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  retryOnUnauthorized?: boolean
  accessTokenOverride?: string
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export class ApiClient {
  private readonly options: ApiClientOptions
  private refreshPromise: Promise<RefreshResponse> | null = null

  constructor(options: ApiClientOptions) {
    this.options = options
  }

  register(input: RegisterRequest): Promise<AuthResponse> {
    const payload = registerRequestSchema.parse(input)
    return this.request('/api/auth/register', authResponseSchema, {
      method: 'POST',
      body: payload,
      auth: false,
    })
  }

  login(input: LoginRequest): Promise<AuthResponse> {
    const payload = loginRequestSchema.parse(input)
    return this.request('/api/auth/login', authResponseSchema, {
      method: 'POST',
      body: payload,
      auth: false,
    })
  }

  refresh(input: RefreshRequest = {}): Promise<RefreshResponse> {
    const payload = refreshRequestSchema.parse(input)
    return this.request('/api/auth/refresh', refreshResponseSchema, {
      method: 'POST',
      body: payload,
      auth: false,
      retryOnUnauthorized: false,
    })
  }

  me(): Promise<MeResponse> {
    return this.request('/api/auth/me', meResponseSchema, {
      auth: true,
    })
  }

  saveArtwork(artworkId: string): Promise<SaveArtworkResponse> {
    return this.request(`/api/collection/${artworkId}`, saveArtworkResponseSchema, {
      method: 'POST',
      auth: true,
    })
  }

  unsaveArtwork(artworkId: string): Promise<SaveArtworkResponse> {
    return this.request(`/api/collection/${artworkId}`, saveArtworkResponseSchema, {
      method: 'DELETE',
      auth: true,
    })
  }

  getSaveStatus(artworkId: string): Promise<SaveArtworkResponse> {
    return this.request(`/api/collection/${artworkId}`, saveArtworkResponseSchema, {
      auth: true,
    })
  }

  listSaved(): Promise<SavedArtworkListDto> {
    return this.request('/api/collection', savedArtworkListSchema, { auth: true })
  }

  listSavedIds(): Promise<SavedIdsDto> {
    return this.request('/api/collection/saved-ids', savedIdsSchema, { auth: true })
  }

  async logout(input: LogoutRequest = {}) {
    const payload = logoutRequestSchema.parse(input)
    await this.rawRequest('/api/auth/logout', {
      method: 'POST',
      body: payload,
      auth: false,
      retryOnUnauthorized: false,
    })
  }

  async expireSession() {
    this.options.setAccessToken(null)
    await this.rawRequest('/api/auth/logout', {
      method: 'POST',
      body: {},
      auth: false,
      retryOnUnauthorized: false,
    }).catch(() => undefined)
    await this.options.onAuthExpired?.()
  }

  async requestJson<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.rawRequest(path, { auth: true, ...options })
    try {
      return (await response.json()) as T
    } catch {
      throw new ApiRequestError(response.status, 'PARSE_ERROR', 'Server returned invalid JSON')
    }
  }

  private async request<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    options: RequestOptions,
  ): Promise<z.infer<TSchema>> {
    const response = await this.rawRequest(path, options)
    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new ApiRequestError(response.status, 'PARSE_ERROR', 'Server returned invalid JSON')
    }
    const result = schema.safeParse(data)
    if (!result.success) {
      throw new ApiRequestError(response.status, 'SCHEMA_MISMATCH', 'Server response format is unexpected')
    }
    return result.data
  }

  private async rawRequest(path: string, options: RequestOptions): Promise<Response> {
    let response: Response
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers: this.headers(options),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
    } catch (error) {
      throw new ApiRequestError(0, 'NETWORK_ERROR', 'Сервер недоступен. Проверьте подключение. / Server unreachable. Check connection.')
    }

    if (response.status === 401 && options.auth && options.retryOnUnauthorized !== false) {
      const refreshed = await this.refreshOnce().catch(async (error: unknown) => {
        await this.expireSession()
        throw error
      })
      this.options.setAccessToken(refreshed.accessToken)
      return this.rawRequest(path, {
        ...options,
        accessTokenOverride: refreshed.accessToken,
        retryOnUnauthorized: false,
      })
    }

    if (!response.ok) {
      throw await toApiError(response)
    }

    return response
  }

  private refreshOnce() {
    this.refreshPromise ??= this.refresh().finally(() => {
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  private headers(options: RequestOptions) {
    const headers = new Headers({
      'X-Client-Platform': 'web',
    })

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    if (options.auth) {
      const accessToken = options.accessTokenOverride ?? this.options.getAccessToken()
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
      }
    }

    return headers
  }
}

async function toApiError(response: Response) {
  const fallbackMessage = `Request failed with status ${response.status}`

  try {
    const parsed = apiErrorSchema.parse(await response.json())
    return new ApiRequestError(response.status, parsed.error.code, parsed.error.message)
  } catch {
    return new ApiRequestError(response.status, 'INTERNAL_ERROR', fallbackMessage)
  }
}
