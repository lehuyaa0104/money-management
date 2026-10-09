import { api } from '@/shared/api/apiClient'
import type { Category, NewCategory } from './types'

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await api.get<{ categories: Category[] }>('/categories', { signal })
  return data.categories
}

export async function createCategory(input: NewCategory): Promise<Category> {
  const { data } = await api.post<{ category: Category }>('/categories', input)
  return data.category
}

/** Adds the built-in categories the user doesn't have yet (safe to repeat). */
export async function createDefaultCategories(): Promise<{ created: number; categories: Category[] }> {
  const { data } = await api.post<{ created: number; categories: Category[] }>('/categories/defaults')
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${encodeURIComponent(id)}`)
}
