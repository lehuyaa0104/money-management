import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import type { Transaction } from '@/features/transactions/types'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency, todayISO } from '@/shared/utils/format'
import { cycleAt, inCycle, sumBy, totalBalance } from '@/features/transactions/stats'
import { useCycleStartDay } from '@/features/auth/useAuth'
import Text from '@/shared/ui/Text'

const MASK = '••••••'

interface BalanceCardProps {
  transactions: Transaction[]
}

export default function BalanceCard({ transactions }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)

  const balance = formatCurrency(totalBalance(transactions))
  const thisMonth = inCycle(transactions, cycleAt(todayISO(), useCycleStartDay()))
  const income = sumBy(thisMonth, 'income')
  const expense = sumBy(thisMonth, 'expense')

  const stats: { label: string; icon: LucideIcon; value: number }[] = [
    { label: 'Thu nhập', icon: ArrowDownLeft, value: income },
    { label: 'Chi tiêu', icon: ArrowUpRight, value: expense },
  ]

  return (
    <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary to-teal-600 p-6 text-white shadow-lg shadow-primary/20">
      <div aria-hidden="true" className="absolute -top-16 -right-16 size-52 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -right-6 -bottom-24 size-44 rounded-full bg-white/10" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <Text variant="caption" tone="inverse-muted" weight="medium">
            Tổng số dư
          </Text>
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            aria-label={hidden ? 'Hiện số dư' : 'Ẩn số dư'}
            className="-m-2 grid size-10 place-items-center rounded-full text-white/75 active:bg-white/10"
          >
            {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>

        <Text variant="display" className={cn('mt-1', balance.length > 14 && 'text-3xl')}>
          {hidden ? MASK : balance}
        </Text>

        <Text variant="caption" tone="inverse-muted" className="mt-5 text-xs">
          Tháng này
        </Text>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {stats.map(({ label, icon: Icon, value }) => (
            <div key={label} className="min-w-0 rounded-2xl bg-white/15 px-3 py-3 backdrop-blur-sm">
              <Text as="span" variant="caption" tone="inverse-muted" className="flex items-center gap-1 text-xs">
                <Icon className="size-3.5 shrink-0" /> {label}
              </Text>
              <Text weight="bold" className="mt-1 truncate text-lg">
                {hidden ? MASK : formatCompactCurrency(value)}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
