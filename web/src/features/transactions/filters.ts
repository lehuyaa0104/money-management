import type { Transaction, TransactionType } from './types'
import { normalizeText } from '@/shared/utils/search'

export interface TransactionFilters {
  type: 'all' | TransactionType
  /** `${type}:${name}` — a name can exist as both an expense and an income category. */
  categories: string[]
}

export const EMPTY_FILTERS: TransactionFilters = { type: 'all', categories: [] }

export function categoryKey(type: TransactionType, name: string): string {
  return `${type}:${name}`
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return filters.type !== 'all' || filters.categories.length > 0
}

export function applyFilters(transactions: Transaction[], filters: TransactionFilters, query: string): Transaction[] {
  const needle = normalizeText(query)
  return transactions.filter(
    (t) =>
      (filters.type === 'all' || t.type === filters.type) &&
      (filters.categories.length === 0 || filters.categories.includes(categoryKey(t.type, t.category))) &&
      (needle === '' || normalizeText(`${t.note} ${t.category}`).includes(needle)),
  )
}
