import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import { createGoal, deleteGoal, depositToGoal, listGoals, updateGoal, withdrawFromGoal } from './goalApi'

export type GoalColor = 'blue' | 'orange' | 'violet' | 'pink' | 'teal' | 'green'

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  /** "YYYY-MM", optional. */
  deadline?: string
  color: GoalColor
  /** Compressed JPEG data URL, optional. */
  image?: string
}

export type GoalInput = Omit<Goal, 'id'>

type Status = 'loading' | 'ready' | 'error'

/** The user's savings goals from the API, newest first. */
export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listGoals(controller.signal)
      .then((list) => {
        setGoals(list)
        setStatus('ready')
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
        setStatus('error')
      })
    return () => controller.abort()
  }, [version])

  const retry = useCallback(() => {
    setStatus('loading')
    setVersion((n) => n + 1)
  }, [])

  // Mutations throw ApiError on failure so the sheet can show it; on success the
  // goal returned by the server replaces the local copy.
  const replace = useCallback((goal: Goal) => setGoals((list) => list.map((g) => (g.id === goal.id ? goal : g))), [])

  const create = useCallback(async (input: GoalInput) => {
    const goal = await createGoal(input)
    setGoals((list) => [goal, ...list])
  }, [])
  const update = useCallback(async (id: string, input: GoalInput) => replace(await updateGoal(id, input)), [replace])
  const deposit = useCallback(async (id: string, amount: number) => replace(await depositToGoal(id, amount)), [replace])
  const withdraw = useCallback(
    async (id: string, amount: number) => {
      try {
        replace(await withdrawFromGoal(id, amount))
      } catch (err) {
        // Saved changed elsewhere (another device): refresh so the sheet shows the real amount.
        if (err instanceof ApiError && err.code === 'withdraw_too_large') setVersion((n) => n + 1)
        throw err
      }
    },
    [replace],
  )
  const remove = useCallback(async (id: string) => {
    await deleteGoal(id)
    setGoals((list) => list.filter((g) => g.id !== id))
  }, [])

  return { goals, status, error, retry, create, update, deposit, withdraw, remove }
}
