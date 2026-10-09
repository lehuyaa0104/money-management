// The API tokens, kept in their own module so both the HTTP client (which
// attaches it) and the auth service (which saves it) can use it without
// importing each other.

const TOKEN_KEY = 'mm.token'

export interface StoredToken {
  token: string
  expiresAt: string // ISO, of `token`
  /** Swapped for a new pair once `token` expires; missing in sessions saved before it existed. */
  refreshToken?: string
}

export function readToken(): StoredToken | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    return stored ? (JSON.parse(stored) as StoredToken) : null
  } catch {
    return null
  }
}

export function saveToken(token: StoredToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isExpired(token: StoredToken): boolean {
  return new Date(token.expiresAt).getTime() <= Date.now()
}
