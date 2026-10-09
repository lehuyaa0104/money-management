import { TrendingDown, TrendingUp } from 'lucide-react'
import type { Transaction } from '@/features/transactions/types'
import { formatCurrency, formatDayMonth, todayISO } from '@/shared/utils/format'
import { weeklySpending } from '@/features/transactions/stats'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import SpendingLineChart from './SpendingLineChart'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 })

export default function WeeklySpendingCard({ transactions }: { transactions: Transaction[] }) {
  const { days, total, previousTotal } = weeklySpending(transactions, todayISO())
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : null
  const spentLess = change !== null && change <= 0

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text as="h2" variant="subheading">
            Chi tiêu 7 ngày
          </Text>
          <Text variant="caption" tone="muted">
            {formatDayMonth(days[0].date)} – {formatDayMonth(days[days.length - 1].date)}
          </Text>
        </div>
        <div className="text-right">
          <Text as="p" variant="heading">
            {formatCurrency(total)}
          </Text>
          {change !== null && (
            <Text
              variant="caption"
              weight="semibold"
              tone={spentLess ? 'primary' : 'danger'}
              className="flex items-center justify-end gap-1"
            >
              {spentLess ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
              {percentFormatter.format(Math.abs(change))} {spentLess ? 'ít hơn' : 'nhiều hơn'}
            </Text>
          )}
        </div>
      </div>

      <div className="mt-2">
        <SpendingLineChart days={days} />
      </div>
    </Card>
  )
}
