import { createContext } from 'react'
import type { RegisterInput, User } from './types'

export interface AuthContextValue {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  /** Saves on the server; throws ApiError on failure. */
  setCycleStartDay: (day: number) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
