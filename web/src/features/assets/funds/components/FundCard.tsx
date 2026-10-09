import { signedPercent } from '@/features/assets/assetKinds'
import { formatNav, formatUnits } from '@/features/assets/funds/fundFormat'
import { fundPosition, isNavStale, type DatedNav } from '@/features/assets/funds/fundStats'
import type { FundAsset } from '@/features/assets/useAssets'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatDayMonth, todayISO } from '@/shared/utils/format'

/** One fund on the assets list: units, average cost, value and how fresh the NAV is. */
export default function FundCard({ asset: a, market, onSelect }: { asset: FundAsset; market?: DatedNav; onSelect: () => void }) {
  const p = fundPosition(a.details, market)
  const stale = isNavStale(p.navDate, todayISO())
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-gray-50">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-xs font-bold text-violet-600">
        {a.details.code.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Text as="span" weight="bold" className="truncate">
            {a.details.code}
          </Text>
          <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-gray-500">CCQ</span>
        </span>
        <Text as="span" variant="caption" tone="subtle" className="block truncate">
          {formatUnits(p.units)} CCQ · giá vốn {formatCompactCurrency(Math.round(p.averageCost))}
        </Text>
        <span className={cn('block truncate text-xs', stale ? 'font-semibold text-orange-600' : 'text-gray-400')}>
          NAV {formatNav(p.nav)} · {formatDayMonth(p.navDate)}
          {stale && ' · cần cập nhật'}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <Text as="span" weight="bold" className="block">
          {formatCompactCurrency(p.value)}
        </Text>
        {p.gainRate !== null && (
          <span className={cn('text-sm font-semibold', p.gain >= 0 ? 'text-primary' : 'text-red-600')}>{signedPercent.format(p.gainRate)}</span>
        )}
      </span>
    </button>
  )
}
