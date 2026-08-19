import { createContext } from 'react'
import type { LoginRequest, RegisterRequest, UserDto } from '@duo-mesh/contracts'
import type { ApiClient } from './api'

export type AuthContextValue = {
  user: UserDto | null
  accessToken: string | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  api: ApiClient
  register: (input: RegisterRequest) => Promise<void>
  login: (input: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
