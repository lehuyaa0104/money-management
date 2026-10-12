import { debtType } from '@/features/assets/debts/debtOptions'
import { debtStatus } from '@/features/assets/debts/debtStats'
import type { DebtAsset } from '@/features/assets/useAssets'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatDate, todayISO } from '@/shared/utils/format'

const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

/** One debt on the assets list: what's left, how much is repaid and the deadline. */
export default function DebtCard({ asset: a, onSelect }: { asset: DebtAsset; onSelect: () => void }) {
  const d = a.details
  const s = debtStatus(d, todayISO())
  const { label, icon: Icon } = debtType(d.type)
  const overdue = s.daysLeft !== null && s.daysLeft < 0
  // Only inline elements inside the button, so screen readers read it as one control.
  return (
    <button type="button" onClick={onSelect} className="block w-full rounded-3xl bg-white p-5 text-left shadow-sm active:bg-gray-50">
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <Text as="span" weight="bold" className="block truncate">
            {a.name || d.lender}
          </Text>
          <Text as="span" variant="caption" tone="muted" className="block truncate">
            {a.name ? `${d.lender} · ` : ''}
            {label}
          </Text>
        </span>
        {s.remaining === 0 && <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">Đã trả hết</span>}
      </span>

      <span className="mt-4 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <Text as="span" variant="caption" tone="muted" className="block">
            Còn nợ
          </Text>
          <Text as="span" variant="heading" className="block truncate text-red-600">
            {formatCurrency(s.remaining)}
          </Text>
        </span>
        <span className="shrink-0 text-right">
          <Text as="span" variant="caption" tone="muted" className="block">
            Đã trả
          </Text>
          <Text as="span" weight="bold" className="block">
            {percent.format(s.progress)}
          </Text>
        </span>
      </span>

      <span
        role="progressbar"
        aria-label="Đã trả"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s.progress * 100)}
        className="mt-3 block h-2 overflow-hidden rounded-full bg-gray-100"
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${s.progress * 100}%` }} />
      </span>

      {s.daysLeft !== null && (
        <span className={cn('mt-3 block text-sm', overdue ? 'font-semibold text-red-600' : 'text-gray-500')}>
          Hạn trả {formatDate(d.dueDate)} · {overdue ? `quá hạn ${-s.daysLeft} ngày` : `còn ${s.daysLeft} ngày`}
        </span>
      )}
    </button>
  )
}
