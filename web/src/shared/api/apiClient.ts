import axios, { isAxiosError } from 'axios'
import { isExpired, readToken, saveToken, type StoredToken } from './tokenStorage'

/** An error from the API (or no response at all). `message` is safe to show users. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Shared axios instance. In dev, "/api" is proxied to the Go server by Vite. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  // Render's free plan sleeps when idle and takes up to a minute to wake up.
  timeout: 90_000,
})

let onUnauthorized: (() => void) | null = null

/** Called when the session is over: the refresh token was refused (expired, or signed out by a password change). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

let refreshing: Promise<StoredToken | null> | null = null

/**
 * Swaps the refresh token for a new pair and saves it; resolves null when the
 * session is over. Concurrent callers share one request, since each refresh
 * token works only once. Network errors are thrown, not treated as signed out.
 */
function refreshSession(): Promise<StoredToken | null> {
  refreshing ??= (async () => {
    const refreshToken = readToken()?.refreshToken
    if (!refreshToken) return null
    try {
      // Plain axios, so this request skips the interceptors below.
      const { data } = await axios.post<{ token: string; expiresAt: string; refreshToken: string }>(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { timeout: api.defaults.timeout },
      )
      const token = { token: data.token, expiresAt: data.expiresAt, refreshToken: data.refreshToken }
      saveToken(token)
      return token
    } catch (err) {
      if (!isAxiosError(err) || err.response?.status !== 401) throw toApiError(err)
      // Another tab may have just used the same refresh token and saved the next one.
      const latest = readToken()
      return latest?.refreshToken && latest.refreshToken !== refreshToken ? latest : null
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

// Attach the signed-in user's token to every request, renewing it first if it has expired.
api.interceptors.request.use(async (config) => {
  let token = readToken()
  if (token && isExpired(token)) {
    token = await refreshSession()
    if (!token) onUnauthorized?.()
  }
  if (token) config.headers.Authorization = `Bearer ${token.token}`
  return config
})

// Turn every failure into an ApiError, so callers only deal with one error type.
api.interceptors.response.use(undefined, async (error: unknown) => {
  // A failed refresh in the request interceptor already is an ApiError.
  const apiError = error instanceof ApiError ? error : toApiError(error)
  const config = isAxiosError(error) ? (error.config as (typeof error.config & { _retried?: boolean }) | undefined) : undefined
  // Only for authenticated calls (a 401 from /auth/login means wrong credentials):
  // the token was rejected before its expiry, e.g. clock skew; renew it and retry once.
  if (apiError.status === 401 && config?.headers?.Authorization && !config._retried) {
    let token: StoredToken | null
    try {
      token = await refreshSession()
    } catch {
      return Promise.reject(apiError) // offline: keep the session, the user can retry
    }
    if (token) return api({ ...config, _retried: true } as typeof config)
    onUnauthorized?.()
  }
  return Promise.reject(apiError)
})

function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) return new ApiError(0, 'unknown_error', 'Đã có lỗi xảy ra, vui lòng thử lại')
  if (!error.response) {
    // Timeout, offline, or the request never reached a server.
    return new ApiError(0, 'network_error', 'Không thể kết nối máy chủ, vui lòng thử lại')
  }

  // The API always answers errors as { error: { code, message } }.
  const { status, data } = error.response
  const body = (data as { error?: { code?: string; message?: string } } | undefined)?.error
  if (body?.code && body.message) return new ApiError(status, body.code, body.message)
  // No API error body: the server is down or a proxy in front of it failed.
  return new ApiError(status, 'server_unavailable', 'Máy chủ đang không phản hồi, vui lòng thử lại sau')
}
