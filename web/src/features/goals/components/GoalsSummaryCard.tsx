import { formatCurrency } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

export default function GoalsSummaryCard({ saved, target }: { saved: number; target: number }) {
  const progress = target > 0 ? saved / target : 0

  return (
    <section className="rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <Text variant="caption" tone="inverse-muted" weight="medium">
        Tổng đã tiết kiệm
      </Text>
      <Text variant="display" className="mt-1 truncate">
        {formatCurrency(saved)}
      </Text>
      <Text variant="caption" weight="semibold" className="mt-2 text-green-400">
        trên mục tiêu {formatCurrency(target)} · hoàn thành {percentFormatter.format(Math.min(progress, 1))}
      </Text>
      <div
        role="progressbar"
        aria-label="Tiến độ tiết kiệm"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(progress, 1) * 100)}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"
      >
        <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(progress, 1) * 100}%` }} />
      </div>
    </section>
  )
}
