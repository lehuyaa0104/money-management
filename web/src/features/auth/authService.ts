import type { RegisterInput, User } from './types'
import { ApiError, api } from '@/shared/api/apiClient'
import { clearToken, isExpired, readToken, saveToken, type StoredToken } from '@/shared/api/tokenStorage'

const SESSION_KEY = 'mm.session'

/** A failure the user should see. `code` is the API error code, when there is one. */
export class AuthError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

interface AuthResponse {
  token: string
  expiresAt: string
  refreshToken: string
  user: ApiUser
}

const tokensOf = (data: AuthResponse): StoredToken => ({
  token: data.token,
  expiresAt: data.expiresAt,
  refreshToken: data.refreshToken,
})

interface ApiUser {
  id: string
  username: string
  fullName: string
  createdAt: string
  cycleStartDay: number
}

const toUser = ({ id, username, fullName, createdAt, cycleStartDay }: ApiUser): User => ({
  id,
  username,
  fullName,
  createdAt,
  cycleStartDay,
})

function startSession(user: User, token?: StoredToken): User {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  if (token) saveToken(token)
  return user
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  clearToken()
}

/** POSTs credentials to an auth endpoint and starts a session with the returned token. */
async function authenticate(path: '/auth/register' | '/auth/login', body: object): Promise<User> {
  try {
    const { data } = await api.post<AuthResponse>(path, body)
    return startSession(toUser(data.user), tokensOf(data))
  } catch (err) {
    if (err instanceof ApiError) throw new AuthError(err.message, err.code)
    throw err
  }
}

export function register(input: RegisterInput): Promise<User> {
  return authenticate('/auth/register', input)
}

export function login(username: string, password: string): Promise<User> {
  return authenticate('/auth/login', { username, password })
}

/** Re-reads the signed-in user, e.g. to pick up settings changed on another device. */
export async function refreshUser(): Promise<User> {
  const { data } = await api.get<{ user: ApiUser }>('/auth/me')
  return startSession(toUser(data.user))
}

/** Throws ApiError on failure. */
export async function updateCycleStartDay(cycleStartDay: number): Promise<User> {
  const { data } = await api.patch<{ user: ApiUser }>('/auth/me', { cycleStartDay })
  return startSession(toUser(data.user))
}

/** Signs out every other device; this one gets new tokens. Throws ApiError, e.g. `current_password_wrong`. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await api.put<AuthResponse>('/auth/password', { currentPassword, newPassword })
  startSession(toUser(data.user), tokensOf(data))
}

export async function logout(): Promise<void> {
  clearSession()
}

export function getCurrentUser(): User | null {
  const token = readToken()
  // No token (e.g. a session left over from the old local mock), or an expired one
  // that can't be renewed: sign in again. A refresh token that the server refuses
  // ends the session on the first request instead.
  if (!token || (isExpired(token) && !token.refreshToken)) {
    clearSession()
    return null
  }
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? (JSON.parse(stored) as User) : null
  } catch {
    return null
  }
}
