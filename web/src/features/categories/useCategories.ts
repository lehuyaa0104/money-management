import { useContext } from 'react'
import { CategoriesContext } from './CategoriesContext'

/** The signed-in user's categories (shared, loaded once after sign-in). */
export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used inside <CategoriesProvider>')
  return ctx
}
