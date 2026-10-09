import { formatNav, formatUnits } from '@/features/assets/funds/fundFormat'
import type { FundTransaction } from '@/features/assets/funds/types'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatDate } from '@/shared/utils/format'

export default function FundTransactionRow({ tx, onSelect }: { tx: FundTransaction; onSelect: () => void }) {
  const buy = tx.type === 'buy'
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50">
      <span className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-bold', buy ? 'bg-primary-soft text-primary' : 'bg-red-50 text-red-600')}>
        {buy ? 'Mua' : 'Bán'}
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" weight="semibold" className="block">
          {formatDate(tx.date)}
        </Text>
        <Text as="span" variant="caption" tone="muted" className="block truncate">
          {formatUnits(tx.units)} CCQ · NAV {formatNav(tx.nav)}
        </Text>
      </span>
      <Text as="span" weight="bold" className={cn('shrink-0', buy ? 'text-gray-900' : 'text-primary')}>
        {buy ? '−' : '+'}
        {formatCurrency(tx.amount)}
      </Text>
    </button>
  )
}
