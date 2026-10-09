import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import { ApiError } from '@/shared/api/apiClient'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import { TransactionsContext, type TransactionsContextValue } from './TransactionsContext'
import { createTransaction, deleteTransaction, listTransactions, toTransaction } from './transactionApi'
import type { Transaction } from './types'

type Status = 'loading' | 'ready' | 'error'

/**
 * Layout route (inside RequireAuth): loads the signed-in user's transactions from
 * the API once and shares them with every page below.
 */
export default function TransactionsProvider() {
  const { logout } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listTransactions(controller.signal)
      .then((list) => {
        setTransactions(list.map(toTransaction))
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
        setStatus('error')
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const value: TransactionsContextValue = {
    transactions,
    createTransaction: async (input) => {
      const tx = toTransaction(await createTransaction(input))
      // Keep the list newest first (by date, then time), like the API returns it.
      setTransactions((prev) =>
        [tx, ...prev].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      )
      return tx
    },
    deleteTransaction: async (id) => {
      await deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    },
  }

  // Every page computes balances and charts from this list, so wait for it rather
  // than briefly showing "no transactions" and zero totals.
  if (status !== 'ready') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-120 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center">
        {status === 'loading' ? (
          <>
            <span aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
            <Text tone="muted">Đang tải dữ liệu…</Text>
          </>
        ) : (
          <>
            <Text as="p" variant="subheading">
              Không tải được giao dịch
            </Text>
            <Text tone="muted">{error}</Text>
            <Button className="mt-2 h-12 w-auto px-8" onClick={retry}>
              Thử lại
            </Button>
            <button type="button" onClick={logout} className="text-sm font-semibold text-gray-500">
              Đăng xuất
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <TransactionsContext.Provider value={value}>
      <Outlet />
    </TransactionsContext.Provider>
  )
}
