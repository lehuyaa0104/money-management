import { signedPercent } from '@/features/assets/assetKinds'
import { formatNav, formatUnits } from '@/features/assets/funds/fundFormat'
import type { FundPosition } from '@/features/assets/funds/fundStats'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency, formatDate } from '@/shared/utils/format'

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCompactCurrency(Math.abs(n))}`

export default function FundSummaryCard({ position: p }: { position: FundPosition }) {
  const tiles: [string, string, string?][] = [
    ['Số CCQ', formatUnits(p.units)],
    ['Giá vốn TB', formatNav(Math.round(p.averageCost))],
    ['Lãi đã chốt', signed(p.realizedGain), p.realizedGain >= 0 ? 'text-green-400' : 'text-red-400'],
  ]
  return (
    <section className="rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <Text variant="caption" tone="inverse-muted" weight="medium">
        Giá trị hiện tại
      </Text>
      <Text variant="display" className="mt-1 truncate">
        {formatCurrency(p.value)}
      </Text>
      {p.gainRate !== null && (
        <p className={cn('mt-2 text-sm font-bold', p.gain >= 0 ? 'text-green-400' : 'text-red-400')}>
          {signed(p.gain)} ({signedPercent.format(p.gainRate)}) <span className="font-normal text-white/60">chưa chốt</span>
        </p>
      )}
      <p className="mt-1 text-sm text-white/60">
        NAV {formatNav(p.nav)} ngày {formatDate(p.navDate)}
      </p>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        {tiles.map(([label, value, tone]) => (
          <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3">
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className={cn('mt-0.5 truncate font-bold', tone)}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
