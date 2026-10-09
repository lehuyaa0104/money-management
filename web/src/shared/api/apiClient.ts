import axios, { isAxiosError } from 'axios'
import { isExpired, readToken } from './tokenStorage'

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
  timeout: 15_000,
})

// Attach the signed-in user's token to every request.
api.interceptors.request.use((config) => {
  const token = readToken()
  if (token && !isExpired(token)) config.headers.Authorization = `Bearer ${token.token}`
  return config
})

let onUnauthorized: (() => void) | null = null

/** Called when a request sent with a token gets 401 (token expired or revoked). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// Turn every failure into an ApiError, so callers only deal with one error type.
api.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  // Only for authenticated calls: a 401 from /auth/login means wrong credentials.
  if (apiError.status === 401 && isAxiosError(error) && error.config?.headers?.Authorization) onUnauthorized?.()
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
