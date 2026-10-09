import { Wallet } from 'lucide-react'
import { monthlyInterest, yearlyInterest } from '@/features/assets/assetStats'
import type { Asset } from '@/features/assets/useAssets'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, formatCurrency, todayISO } from '@/shared/utils/format'

const rateFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Share of the current year that has passed, for the "interest this year" bar. */
function yearElapsed(): number {
  const today = new Date(`${todayISO()}T00:00:00`)
  const start = new Date(today.getFullYear(), 0, 1)
  const end = new Date(today.getFullYear() + 1, 0, 1)
  return (today.getTime() - start.getTime()) / (end.getTime() - start.getTime())
}

export default function SavingsCard({ asset: a, onSelect }: { asset: Asset; onSelect: () => void }) {
  const elapsed = yearElapsed()
  // Only inline elements inside the button, so screen readers read it as one control.
  return (
    <button type="button" onClick={onSelect} className="block w-full rounded-3xl bg-white p-5 text-left shadow-sm active:bg-gray-50">
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          <Wallet className="size-5" />
        </span>
        <Text as="span" weight="bold" className="min-w-0 flex-1 truncate">
          {a.name}
        </Text>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">{rateFormat.format(a.rate)}%/năm</span>
      </span>
      <span className="mt-4 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <Text as="span" variant="caption" tone="muted" className="block">
            Số dư hiện tại
          </Text>
          <Text as="span" variant="heading" className="block truncate">
            {formatCurrency(a.balance)}
          </Text>
        </span>
        <span className="shrink-0 text-right">
          <Text as="span" variant="caption" tone="muted" className="block">
            Lãi/tháng
          </Text>
          <Text as="span" variant="heading" tone="primary" className="block">
            +{formatCompactCurrency(monthlyInterest(a))}
          </Text>
        </span>
      </span>
      <span className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <Text as="span" variant="caption" tone="muted">
          Dự kiến lãi cả năm
        </Text>
        <Text as="span" weight="bold" tone="primary" className="text-sm">
          +{formatCompactCurrency(yearlyInterest(a))}
        </Text>
      </span>
      <span
        role="progressbar"
        aria-label="Đã qua trong năm"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(elapsed * 100)}
        className="mt-2 block h-2 overflow-hidden rounded-full bg-gray-100"
      >
        <span className="block h-full rounded-full bg-blue-600" style={{ width: `${elapsed * 100}%` }} />
      </span>
    </button>
  )
}
