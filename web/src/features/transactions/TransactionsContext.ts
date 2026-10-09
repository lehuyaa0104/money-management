import { createContext } from 'react'
import type { CreateTransactionInput } from './transactionApi'
import type { Transaction } from './types'

export interface TransactionsContextValue {
  /** The signed-in user's transactions from the API, newest first. */
  transactions: Transaction[]
  /** Saves on the server, then adds it to the list. Throws ApiError on failure (nothing is added). */
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>
  /** Deletes on the server, then removes it from the list. Throws ApiError on failure. */
  deleteTransaction: (id: string) => Promise<void>
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null)
