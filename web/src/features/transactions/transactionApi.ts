import { api } from '@/shared/api/apiClient'
import type { Transaction, TransactionType } from './types'

export interface CreateTransactionInput {
  type: TransactionType
  amount: number
  categoryId: string
  date: string // YYYY-MM-DD
  note: string
  /** ISO timestamp of when it happened (date + time picked by the user). */
  occurredAt: string
}

/** A transaction as the API returns it. */
export interface ApiTransaction {
  id: string
  type: TransactionType
  amount: number
  /** null once the category has been deleted; categoryName keeps the name. */
  categoryId: string | null
  categoryName: string
  date: string
  note: string
  occurredAt: string
  createdAt: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<ApiTransaction> {
  const { data } = await api.post<{ transaction: ApiTransaction }>('/transactions', input)
  return data.transaction
}

export async function listTransactions(signal?: AbortSignal): Promise<ApiTransaction[]> {
  const { data } = await api.get<{ transactions: ApiTransaction[] }>('/transactions', { signal })
  return data.transactions
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${encodeURIComponent(id)}`)
}

/** The shape the screens use: the category by name (for icon/color lookup) and the time it happened. */
export function toTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    categoryId: t.categoryId,
    category: t.categoryName,
    date: t.date,
    note: t.note,
    createdAt: t.occurredAt,
  }
}
