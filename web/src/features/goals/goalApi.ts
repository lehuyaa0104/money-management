import { api } from '@/shared/api/apiClient'
import type { Goal, GoalInput } from './useGoals'

const path = (id: string, action = '') => `/goals/${encodeURIComponent(id)}${action}`

export async function listGoals(signal?: AbortSignal): Promise<Goal[]> {
  const { data } = await api.get<{ goals: Goal[] }>('/goals', { signal })
  return data.goals
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const { data } = await api.post<{ goal: Goal }>('/goals', input)
  return data.goal
}

/** Replaces every field: an omitted deadline or image is cleared. */
export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const { data } = await api.put<{ goal: Goal }>(path(id), input)
  return data.goal
}

export async function depositToGoal(id: string, amount: number): Promise<Goal> {
  const { data } = await api.post<{ goal: Goal }>(path(id, '/deposit'), { amount })
  return data.goal
}

/** Fails with `withdraw_too_large` if amount is more than what's saved. */
export async function withdrawFromGoal(id: string, amount: number): Promise<Goal> {
  const { data } = await api.post<{ goal: Goal }>(path(id, '/withdraw'), { amount })
  return data.goal
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(path(id))
}
