import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 })
const wholePercentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

/** "7,2%" but "127%" — three-digit changes drop the decimal to fit a narrow column. */
const formatChange = (ratio: number) => (ratio >= 1 ? wholePercentFormatter : percentFormatter).format(ratio)

interface OverviewCardProps {
  spent: number
  /** Spending over the same days of last month, for a fair month-to-date comparison. */
  previousSamePeriod: number
  dailyAverage: number
  transactionCount: number
}

export default function OverviewCard({ spent, previousSamePeriod, dailyAverage, transactionCount }: OverviewCardProps) {
  const change = previousSamePeriod > 0 ? (spent - previousSamePeriod) / previousSamePeriod : null
  const less = change !== null && change <= 0

  return (
    <section className="rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <Text variant="caption" tone="inverse-muted" weight="medium">
        Tổng chi
      </Text>
      <Text variant="display" className={cn('mt-1', formatCurrency(spent).length > 14 && 'text-3xl')}>
        {formatCurrency(spent)}
      </Text>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <Text as="dt" variant="caption" tone="inverse-muted" className="truncate text-xs">
            So với cùng kỳ
          </Text>
          <dd>
            {change === null ? (
              <Text as="span" weight="bold">
                —
              </Text>
            ) : (
              <Text
                as="span"
                weight="bold"
                className={cn('flex items-center gap-1', less ? 'text-green-400' : 'text-red-300')}
              >
                {less ? <TrendingDown className="size-4 shrink-0" /> : <TrendingUp className="size-4 shrink-0" />}
                <span className="sr-only">{less ? 'Ít hơn' : 'Nhiều hơn'}</span>
                <span className="truncate">
                  {less ? '−' : '+'}
                  {formatChange(Math.abs(change))}
                </span>
              </Text>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <Text as="dt" variant="caption" tone="inverse-muted" className="truncate text-xs">
            TB mỗi ngày
          </Text>
          <Text as="dd" weight="bold">
            {formatCompactCurrency(dailyAverage)}
          </Text>
        </div>
        <div className="min-w-0">
          <Text as="dt" variant="caption" tone="inverse-muted" className="truncate text-xs">
            Giao dịch
          </Text>
          <Text as="dd" weight="bold">
            {transactionCount}
          </Text>
        </div>
      </dl>
    </section>
  )
}
