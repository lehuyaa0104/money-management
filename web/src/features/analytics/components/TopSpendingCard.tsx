import { useCategories } from '@/features/categories/useCategories'
import { formatCurrency } from '@/shared/utils/format'
import type { SpendingItem } from '@/features/transactions/stats'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'

export default function TopSpendingCard({ items }: { items: SpendingItem[] }) {
  const max = items[0]?.amount ?? 1
  const { lookup } = useCategories()

  return (
    <Card>
      <Text as="h2" variant="subheading">
        Chi nhiều nhất
      </Text>
      {items.length === 0 ? (
        <Text tone="muted" className="py-6 text-center">
          Chưa có khoản chi nào trong tháng này.
        </Text>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((item) => {
            const Icon = lookup('expense', item.category).icon
            return (
              <li key={item.name}>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-gray-50 text-gray-500">
                    <Icon className="size-5" />
                  </span>
                  <Text as="span" weight="semibold" className="min-w-0 flex-1 truncate">
                    {item.name}
                  </Text>
                  <Text as="span" weight="bold" className="whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </Text>
                </div>
                <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.amount / max) * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
