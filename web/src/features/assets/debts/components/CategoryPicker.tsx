import { useId } from 'react'
import { CATEGORY_ICONS, FALLBACK_ICON } from '@/features/categories/icons'
import { useCategories } from '@/features/categories/useCategories'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'

interface CategoryPickerProps {
  label: string
  /** Expense category id, or '' for none. */
  value: string
  onChange: (categoryId: string) => void
}

/** Optional pick of what money was borrowed for, among the user's expense categories; tap again to clear. */
export default function CategoryPicker({ label, value, onChange }: CategoryPickerProps) {
  const labelId = useId()
  const options = useCategories().categories.filter((c) => c.type === 'expense')
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <Text as="span" variant="label" tone="muted" id={labelId}>
        {label}
      </Text>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map(({ id, name, icon }) => {
          const selected = id === value
          const Icon = CATEGORY_ICONS[icon] ?? FALLBACK_ICON
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? '' : id)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition',
                selected ? 'border-transparent bg-primary text-white' : 'border-gray-200 bg-white text-gray-600',
              )}
            >
              <Icon className="size-4" />
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
