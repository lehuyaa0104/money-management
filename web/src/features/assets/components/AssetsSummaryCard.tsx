import { TrendingDown, TrendingUp } from 'lucide-react'
import { signedPercent } from '@/features/assets/assetKinds'
import type { PortfolioSummary } from '@/features/assets/assetStats'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCompactCurrency(Math.abs(n))}`

export default function AssetsSummaryCard({ summary }: { summary: PortfolioSummary }) {
  const GainIcon = summary.gain >= 0 ? TrendingUp : TrendingDown
  return (
    <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <div aria-hidden="true" className="absolute -top-16 -right-16 size-52 rounded-full bg-white/5" />
      <div className="relative">
        <Text variant="caption" tone="inverse-muted" weight="medium">
          Tổng tài sản ròng
        </Text>
        <Text variant="display" className="mt-1 truncate">
          {formatCurrency(summary.netWorth)}
        </Text>
        {summary.gainRate !== null && (
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <GainIcon aria-hidden="true" className={cn('size-4', summary.gain >= 0 ? 'text-green-400' : 'text-red-400')} />
            <span className={cn('font-bold', summary.gain >= 0 ? 'text-green-400' : 'text-red-400')}>
              {signed(summary.gain)} ({signedPercent.format(summary.gainRate)})
            </span>
            <span className="text-white/60">lãi/lỗ đầu tư</span>
          </p>
        )}
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['Đầu tư', formatCompactCurrency(summary.invested), ''],
            ['Tiết kiệm', formatCompactCurrency(summary.savings), ''],
            ['Lãi/tháng', `+${formatCompactCurrency(summary.monthlyInterest)}`, 'text-green-400'],
          ].map(([label, value, tone]) => (
            <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3">
              <dt className="text-xs text-white/60">{label}</dt>
              <dd className={cn('mt-0.5 truncate font-bold', tone)}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
