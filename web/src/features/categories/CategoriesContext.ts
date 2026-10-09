import { createContext } from 'react'
import type { CategoryLookup } from './meta'
import type { Category, NewCategory } from './types'

export interface CategoriesContextValue {
  status: 'loading' | 'ready' | 'error'
  categories: Category[]
  /** User-facing message when status is "error". */
  error: string | null
  retry: () => void
  /** Creates a category on the server and adds it to the list; throws ApiError. */
  create: (input: NewCategory) => Promise<Category>
  /** Deletes a category on the server and drops it from the list; throws ApiError. */
  remove: (id: string) => Promise<void>
  /** Adds the built-in categories the user is missing; returns how many. Throws ApiError. */
  addDefaults: () => Promise<number>
  /** Icon/color for a transaction's category name (falls back for unknown names). */
  lookup: CategoryLookup
}

export const CategoriesContext = createContext<CategoriesContextValue | null>(null)
