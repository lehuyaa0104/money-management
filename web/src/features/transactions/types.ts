export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  /** null if the category was deleted since; `category` still has its name. */
  categoryId: string | null
  /** Category name, used to look up its icon and color. */
  category: string
  date: string // YYYY-MM-DD
  note: string
  /** When it happened (date + time picked by the user), ISO. */
  createdAt: string
}

