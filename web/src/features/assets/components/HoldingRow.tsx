import { ASSET_KINDS, signedPercent } from '@/features/assets/assetKinds'
import { investmentCost, investmentValue } from '@/features/assets/assetStats'
import type { InvestmentAsset } from '@/features/assets/useAssets'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency } from '@/shared/utils/format'

const quantityFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 8 })

export default function HoldingRow({ asset: a, onSelect }: { asset: InvestmentAsset; onSelect: () => void }) {
  const value = investmentValue(a)
  const cost = investmentCost(a)
  const change = cost > 0 ? (value - cost) / cost : 0
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-gray-50">
      <span aria-hidden="true" className={cn('grid size-12 shrink-0 place-items-center rounded-2xl text-xs font-bold', ASSET_KINDS[a.kind].tile)}>
        {a.details.symbol.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Text as="span" weight="bold" className="truncate">
            {a.details.symbol}
          </Text>
          <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-gray-500">{ASSET_KINDS[a.kind].badge}</span>
        </span>
        {a.name && (
          <Text as="span" variant="caption" tone="muted" className="block truncate">
            {a.name}
          </Text>
        )}
        <Text as="span" variant="caption" tone="subtle" className="block truncate">
          {quantityFormat.format(a.details.quantity)} đơn vị · giá vốn {formatCompactCurrency(a.details.costPrice)}
        </Text>
      </span>
      <span className="shrink-0 text-right">
        <Text as="span" weight="bold" className="block">
          {formatCompactCurrency(value)}
        </Text>
        <span className={cn('text-sm font-semibold', value >= cost ? 'text-primary' : 'text-red-600')}>{signedPercent.format(change)}</span>
      </span>
    </button>
  )
}
