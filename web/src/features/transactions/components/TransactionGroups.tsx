import type { Transaction } from '@/features/transactions/types'
import { formatDayLabel } from '@/shared/utils/format'
import { groupByDay } from '@/features/transactions/stats'
import TransactionRow from './TransactionRow'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'

interface TransactionGroupsProps {
  transactions: Transaction[]
  /** Show at most this many transactions (newest first). */
  limit?: number
}

/** Compact list in a single card, used for the "Gần đây" section on home. */
export default function TransactionGroups({ transactions, limit }: TransactionGroupsProps) {
  const visible = limit === undefined ? transactions : groupByDay(transactions).flatMap((g) => g.transactions).slice(0, limit)
  const groups = groupByDay(visible)

  return (
    <Card className="py-2">
      {groups.map((group) => (
        <div key={group.date} className="border-b border-gray-100 py-2 last:border-b-0">
          <Text variant="label" tone="muted" className="py-2">
            {formatDayLabel(group.date)}
          </Text>
          <ul className="divide-y divide-gray-100">
            {group.transactions.map((t) => (
              <li key={t.id}>
                <TransactionRow transaction={t} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}
