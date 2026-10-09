import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '@/shared/api/apiClient'
import { CategoriesContext, type CategoriesContextValue } from './CategoriesContext'
import { createCategory, createDefaultCategories, deleteCategory, listCategories } from './categoryApi'
import { createLookup } from './meta'
import type { Category, NewCategory } from './types'

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')

/**
 * Layout route (inside RequireAuth): loads the signed-in user's categories once
 * and shares them with every page, so creating one updates all screens.
 */
export default function CategoriesProvider() {
  const [categories, setCategories] = useState<Category[]>([])
  const [status, setStatus] = useState<CategoriesContextValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listCategories(controller.signal)
      .then((list) => {
        setCategories(list)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(errorMessage(err))
        setStatus('error')
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const create = useCallback(async (input: NewCategory) => {
    const category = await createCategory(input)
    setCategories((list) => [...list, category])
    return category
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteCategory(id)
    setCategories((list) => list.filter((c) => c.id !== id))
  }, [])

  const addDefaults = useCallback(async () => {
    const result = await createDefaultCategories()
    setCategories(result.categories)
    setStatus('ready')
    return result.created
  }, [])

  const lookup = useMemo(() => createLookup(categories), [categories])

  const value: CategoriesContextValue = { status, categories, error, retry, create, remove, addDefaults, lookup }
  return (
    <CategoriesContext.Provider value={value}>
      <Outlet />
    </CategoriesContext.Provider>
  )
}
