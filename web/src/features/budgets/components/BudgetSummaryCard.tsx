import { formatCurrency } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

interface BudgetSummaryCardProps {
  total: number
  spent: number
}

export default function BudgetSummaryCard({ total, spent }: BudgetSummaryCardProps) {
  const used = total > 0 ? spent / total : 0
  const remaining = total - spent

  return (
    <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary to-teal-600 p-6 text-white shadow-lg shadow-primary/20">
      <div aria-hidden="true" className="absolute -top-16 -right-14 size-48 rounded-full bg-white/10" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Text variant="caption" tone="inverse-muted" weight="medium">
              Tổng ngân sách
            </Text>
            <Text as="p" variant="title" className="mt-1 truncate text-2xl">
              {formatCurrency(total)}
            </Text>
          </div>
          <div className="min-w-0 text-right">
            <Text variant="caption" tone="inverse-muted" weight="medium">
              Đã chi
            </Text>
            <Text as="p" variant="title" className="mt-1 truncate text-2xl">
              {formatCurrency(spent)}
            </Text>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Mức sử dụng ngân sách"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(used * 100)}
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/25"
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(used, 1) * 100}%` }} />
        </div>

        <div className="mt-3 flex justify-between gap-3">
          <Text variant="caption" tone="inverse-muted">
            Đã dùng {percentFormatter.format(used)}
          </Text>
          <Text variant="caption" weight="semibold">
            {remaining >= 0 ? `Còn ${formatCurrency(remaining)}` : `Vượt ${formatCurrency(-remaining)}`}
          </Text>
        </div>
      </div>
    </section>
  )
}
