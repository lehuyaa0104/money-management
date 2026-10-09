import { useEffect, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '@/shared/api/apiClient'
import * as authService from './authService'
import type { User } from './types'
import { AuthContext, type AuthContextValue } from './AuthContext'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser)

  // The server rejected our token (expired/revoked): drop the session so
  // RequireAuth sends the user back to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void authService.logout()
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // The session is cached locally; refresh it once so settings changed elsewhere apply.
  const signedIn = user !== null
  useEffect(() => {
    if (signedIn) authService.refreshUser().then(setUser, () => {})
  }, [signedIn])

  const value: AuthContextValue = {
    user,
    login: async (username, password) => setUser(await authService.login(username, password)),
    register: async (input) => setUser(await authService.register(input)),
    logout: async () => {
      await authService.logout()
      setUser(null)
    },
    setCycleStartDay: async (day) => setUser(await authService.updateCycleStartDay(day)),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
