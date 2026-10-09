import type { Transaction } from '@/features/transactions/types'
import { todayISO } from '@/shared/utils/format'
import { useCategories } from '@/features/categories/useCategories'
import { cycleAt, expensesByCategory, formatCycleLabel, inCycle } from '@/features/transactions/stats'
import { useCycleStartDay } from '@/features/auth/useAuth'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import CategoryDonut from '@/features/transactions/components/CategoryDonut'

export default function CategoryBreakdownCard({ transactions }: { transactions: Transaction[] }) {
  const cycle = cycleAt(todayISO(), useCycleStartDay())
  const { lookup } = useCategories()
  const slices = expensesByCategory(inCycle(transactions, cycle), lookup)

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Text as="h2" variant="subheading">
          Chi tiêu theo danh mục
        </Text>
        <Text as="span" variant="caption" weight="bold" tone="primary" className="whitespace-nowrap">
          {formatCycleLabel(cycle)}
        </Text>
      </div>

      {slices.length > 0 ? (
        <CategoryDonut slices={slices} />
      ) : (
        <Text tone="muted" className="py-6 text-center">
          Chưa có khoản chi nào trong tháng này.
        </Text>
      )}
    </Card>
  )
}
