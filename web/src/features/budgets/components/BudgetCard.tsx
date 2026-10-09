import type { CategoryMeta } from '@/features/categories/meta'
import { STATUS_STYLE, budgetStatus } from '@/features/budgets/budgetStatus'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

interface BudgetCardProps {
  category: CategoryMeta
  limit: number
  spent: number
  onEdit: () => void
}

export default function BudgetCard({ category, limit, spent, onEdit }: BudgetCardProps) {
  const status = budgetStatus(spent, limit)
  const style = STATUS_STYLE[status]
  const Icon = category.icon
  const left = limit - spent

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${category.name}: đã chi ${formatCurrency(spent)} trên ${formatCurrency(limit)}. Chạm để sửa.`}
      className="w-full rounded-3xl bg-white p-5 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', style.tile)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Text as="span" weight="bold" className="truncate">
              {category.name}
            </Text>
            {style.badge && (
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', style.badge.className)}>
                {style.badge.label}
              </span>
            )}
          </div>
          <Text variant="caption" tone="muted" className="mt-0.5 truncate">
            Hạn mức: {formatCurrency(limit)}
          </Text>
        </div>
        <div className="shrink-0 text-right">
          <Text as="p" weight="bold" tone={status === 'over' ? 'danger' : 'default'}>
            {formatCurrency(spent)}
          </Text>
          <Text variant="caption" tone={status === 'over' ? 'danger' : 'muted'} className="mt-0.5">
            {left >= 0 ? `còn ${formatCurrency(left)}` : `+${formatCurrency(-left)} vượt`}
          </Text>
        </div>
      </div>

      <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${Math.min(spent / limit, 1) * 100}%` }} />
      </div>
    </button>
  )
}
