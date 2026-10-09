import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Day of month the signed-in user's budgeting cycles start on (1 = calendar months). */
export function useCycleStartDay(): number {
  return useAuth().user?.cycleStartDay ?? 1
}
