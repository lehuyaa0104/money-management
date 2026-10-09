import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import { createBudget, deleteBudget, listBudgets, updateBudget, type BudgetUsage } from './budgetApi'

type Status = 'loading' | 'ready' | 'error'

/**
 * The user's budgets with what was spent in the cycle starting in `month`
 * ("YYYY-MM") on `startDay`, from the API. "Spent" is computed by the server from
 * that cycle's expenses, so after any change the list is re-fetched rather than
 * patched locally.
 */
export function useBudgets(month: string, startDay: number) {
  const [budgets, setBudgets] = useState<BudgetUsage[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listBudgets(month, startDay, controller.signal)
      .then((list) => {
        setBudgets(list)
        setStatus('ready')
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
        setStatus('error')
      })
    return () => controller.abort()
  }, [month, startDay, version])

  const reload = useCallback(() => setVersion((n) => n + 1), [])

  const retry = useCallback(() => {
    setStatus('loading')
    reload()
  }, [reload])

  // Mutations throw ApiError on failure so the caller (the sheet) can show it.
  const create = useCallback(
    async (categoryId: string, limit: number) => {
      await createBudget(categoryId, limit)
      reload()
    },
    [reload],
  )
  const update = useCallback(
    async (id: string, limit: number) => {
      await updateBudget(id, limit)
      reload()
    },
    [reload],
  )
  const remove = useCallback(
    async (id: string) => {
      await deleteBudget(id)
      setBudgets((list) => list.filter((b) => b.id !== id))
    },
    [],
  )

  return { budgets, status, error, retry, create, update, remove }
}
