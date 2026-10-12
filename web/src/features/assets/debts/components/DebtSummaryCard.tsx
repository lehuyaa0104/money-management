import type { DebtStatus } from '@/features/assets/debts/debtStats'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils/format'

const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

export default function DebtSummaryCard({ status: s }: { status: DebtStatus }) {
  const overdue = s.daysLeft !== null && s.daysLeft < 0
  return (
    <section className="rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <Text variant="caption" tone="inverse-muted" weight="medium">
        Còn nợ
      </Text>
      <Text variant="display" className="mt-1 truncate">
        {formatCurrency(s.remaining)}
      </Text>
      <p className="mt-2 text-sm text-white/70">
        Đã trả {formatCurrency(s.paid)} / tổng vay {formatCurrency(s.borrowed)} · {percent.format(s.progress)}
      </p>
      <div
        role="progressbar"
        aria-label="Đã trả"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s.progress * 100)}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"
      >
        <div className="h-full rounded-full bg-green-400" style={{ width: `${s.progress * 100}%` }} />
      </div>
      {s.daysLeft !== null && (
        <p className={cn('mt-3 text-sm', overdue ? 'font-semibold text-red-400' : 'text-white/70')}>
          {overdue ? `Quá hạn ${-s.daysLeft} ngày` : `Còn ${s.daysLeft} ngày tới hạn trả`}
        </p>
      )}
    </section>
  )
}
