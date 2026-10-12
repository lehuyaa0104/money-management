import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import Text from '@/shared/ui/Text'
import { setDisplayCurrency } from '@/shared/utils/currency'
import { listRates } from './rateApi'

/**
 * Layout route (inside RequireAuth): before the app renders, sets the currency amounts
 * are shown in. Outside VND it loads today's rate; without one (offline, unknown code)
 * amounts stay in VND rather than showing wrong numbers.
 */
export default function CurrencyProvider() {
  const code = useAuth().user?.currency ?? 'VND'
  const [ready, setReady] = useState(code === 'VND')

  useEffect(() => {
    if (code === 'VND') return
    const controller = new AbortController()
    listRates(controller.signal)
      .then((rates) => {
        const rate = rates.find((r) => r.code === code)
        if (rate) setDisplayCurrency({ code, vndPerUnit: rate.vnd })
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setReady(true)
      })
    return () => controller.abort()
  }, [code])

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-120 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center">
        <span aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
        <Text tone="muted">Đang tải tỷ giá…</Text>
      </div>
    )
  }
  return <Outlet />
}
