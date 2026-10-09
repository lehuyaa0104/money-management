import type { Transaction } from '@/features/transactions/types'
import { useCategories } from '@/features/categories/useCategories'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatTime } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

interface TransactionRowProps {
  transaction: Transaction
  /** Makes the whole row tappable. */
  onSelect?: (transaction: Transaction) => void
}

export default function TransactionRow({ transaction: t, onSelect }: TransactionRowProps) {
  const meta = useCategories().lookup(t.type, t.category)
  const Icon = meta.icon
  const details = [t.note ? t.category : null, t.createdAt ? formatTime(t.createdAt) : null].filter(Boolean).join(' · ')

  const content = (
    <>
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-2xl"
        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" weight="semibold" className="block truncate">
          {t.note || t.category}
        </Text>
        {details && (
          <Text as="span" variant="caption" tone="muted" className="block truncate">
            {details}
          </Text>
        )}
      </span>
      <Text as="span" weight="bold" tone={t.type === 'income' ? 'primary' : 'default'} className="whitespace-nowrap">
        {t.type === 'income' ? '+' : '−'}
        {formatCurrency(t.amount)}
      </Text>
    </>
  )

  const rowClass = 'flex w-full items-center gap-3 py-3 text-left'

  return onSelect ? (
    <button type="button" onClick={() => onSelect(t)} className={cn(rowClass, 'rounded-xl active:bg-gray-50')}>
      {content}
    </button>
  ) : (
    <div className={rowClass}>{content}</div>
  )
}
