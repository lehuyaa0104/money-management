import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '@/shared/api/apiClient'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import { createAsset, deleteAsset, listAssets, listFundNavs, updateAsset } from './assetApi'
import { AssetsContext, type AssetsContextValue } from './AssetsContext'
import type { DatedNav } from './funds/fundStats'
import type { Asset } from './useAssets'

type Status = 'loading' | 'ready' | 'error'

/**
 * Layout route for the assets screens: loads the user's assets from the API once and
 * shares them, so a change on one page shows on the others.
 */
export default function AssetsProvider() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [navs, setNavs] = useState<Record<string, DatedNav>>({})

  // Published NAVs are a bonus: without them the user's own NAVs are used, so failures are ignored.
  useEffect(() => {
    const controller = new AbortController()
    listFundNavs(controller.signal).then(setNavs, () => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    listAssets(controller.signal)
      .then((list) => {
        setAssets(list)
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

  const value: AssetsContextValue = {
    assets,
    navs,
    create: async (input) => {
      const asset = await createAsset(input)
      setAssets((list) => [asset, ...list])
      return asset.id
    },
    update: async (id, input) => {
      const asset = await updateAsset(id, input)
      setAssets((list) => list.map((a) => (a.id === id ? asset : a)))
    },
    remove: async (id) => {
      await deleteAsset(id)
      setAssets((list) => list.filter((a) => a.id !== id))
    },
  }

  // The pages decide "not found → back to the list" from this list, so wait for it.
  if (status !== 'ready') {
    return (
      <div className="flex flex-col items-center gap-4 px-8 py-24 text-center">
        {status === 'loading' ? (
          <>
            <span aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
            <Text tone="muted">Đang tải tài sản…</Text>
          </>
        ) : (
          <>
            <Text tone="danger">{error}</Text>
            <Button variant="outline" className="h-11 w-auto px-6" onClick={retry}>
              Thử lại
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <AssetsContext.Provider value={value}>
      <Outlet />
    </AssetsContext.Provider>
  )
}
