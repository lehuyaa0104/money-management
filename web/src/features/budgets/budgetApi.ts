import { api } from '@/shared/api/apiClient'

export interface Budget {
  id: string
  categoryId: string
  /** VND per month; applies to every month. */
  limit: number
  createdAt: string
  updatedAt: string
}

/** A budget with what was spent in its category during the requested cycle. */
export interface BudgetUsage extends Budget {
  spent: number
  /** limit − spent; negative when over budget. */
  remaining: number
}

/** `month` and `startDay` identify the cycle, as in `Cycle`. */
export async function listBudgets(month: string, startDay: number, signal?: AbortSignal): Promise<BudgetUsage[]> {
  const { data } = await api.get<{ budgets: BudgetUsage[] }>('/budgets', { params: { month, startDay }, signal })
  return data.budgets
}

export async function createBudget(categoryId: string, limit: number): Promise<Budget> {
  const { data } = await api.post<{ budget: Budget }>('/budgets', { categoryId, limit })
  return data.budget
}

export async function updateBudget(id: string, limit: number): Promise<Budget> {
  const { data } = await api.put<{ budget: Budget }>(`/budgets/${encodeURIComponent(id)}`, { limit })
  return data.budget
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${encodeURIComponent(id)}`)
}
