import { Navigate, Outlet } from 'react-router'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestOnly() {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : <Outlet />
}
