import type { LucideIcon } from 'lucide-react'
import type { TransactionType } from '@/features/transactions/types'
import { CATEGORY_ICONS, FALLBACK_ICON } from './icons'
import type { Category } from './types'

/** What screens need to draw a category: its name, icon component and color. */
export interface CategoryMeta {
  name: string
  icon: LucideIcon
  color: string
}

/** For names that aren't one of the user's categories (e.g. deleted, or older local data). */
export const UNKNOWN_CATEGORY_COLOR = '#9ca3af'

export function toCategoryMeta(c: Pick<Category, 'name' | 'icon' | 'color'>): CategoryMeta {
  return { name: c.name, icon: CATEGORY_ICONS[c.icon] ?? FALLBACK_ICON, color: c.color }
}

export type CategoryLookup = (type: TransactionType, name: string) => CategoryMeta

/** Transactions reference categories by name; names are unique per type, ignoring case. */
export function createLookup(categories: Category[]): CategoryLookup {
  const byKey = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, toCategoryMeta(c)]))
  return (type, name) =>
    byKey.get(`${type}:${name.toLowerCase()}`) ?? { name, icon: FALLBACK_ICON, color: UNKNOWN_CATEGORY_COLOR }
}
