import type { DebtEntry } from '@/features/assets/debts/debtStats'
import { useCategories } from '@/features/categories/useCategories'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatDate } from '@/shared/utils/format'

/** One line of a debt's history: a borrowing (what it was for) or a repayment. */
export default function DebtEntryRow({ entry, onSelect }: { entry: DebtEntry; onSelect: () => void }) {
  const borrow = entry.kind === 'borrow'
  const category = useCategories().categories.find((c) => borrow && c.id === entry.categoryId)
  const detail = borrow ? [category?.name, entry.note].filter(Boolean).join(' · ') : ''
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50">
      <span className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-bold', borrow ? 'bg-red-50 text-red-600' : 'bg-primary-soft text-primary')}>
        {borrow ? 'Vay' : 'Trả'}
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" weight="semibold" className="block">
          {formatDate(entry.date)}
        </Text>
        {detail && (
          <Text as="span" variant="caption" tone="muted" className="block truncate">
            {detail}
          </Text>
        )}
      </span>
      <Text as="span" weight="bold" className={cn('shrink-0', borrow ? 'text-red-600' : 'text-primary')}>
        {borrow ? '+' : '−'}
        {formatCurrency(entry.amount)}
      </Text>
    </button>
  )
}
