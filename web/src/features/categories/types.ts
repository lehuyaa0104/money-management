import type { TransactionType } from '@/features/transactions/types'

export interface Category {
  id: string
  type: TransactionType
  name: string
  /** lucide-react icon name, e.g. "Utensils"; see ./icons.ts */
  icon: string
  /** "#rrggbb" */
  color: string
  createdAt: string
}

export type NewCategory = Pick<Category, 'type' | 'name' | 'icon' | 'color'>
