import { useState } from 'react'
import { Check } from 'lucide-react'
import { categoryKey, type TransactionFilters } from '@/features/transactions/filters'
import type { TransactionType } from '@/features/transactions/types'
import { useCategories } from '@/features/categories/useCategories'
import { toCategoryMeta } from '@/features/categories/meta'
import { cn } from '@/shared/utils/cn'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import SegmentedControl from '@/shared/ui/SegmentedControl'

const TYPE_OPTIONS: { value: TransactionFilters['type']; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
]

const TYPE_HEADINGS: Record<TransactionType, string> = { expense: 'Danh mục chi', income: 'Danh mục thu' }

interface FilterSheetProps {
  value: TransactionFilters
  onApply: (filters: TransactionFilters) => void
  onClose: () => void
}

export default function FilterSheet({ value, onApply, onClose }: FilterSheetProps) {
  // Edits stay local until "Áp dụng", so closing the sheet discards them.
  const [type, setType] = useState(value.type)
  const [categories, setCategories] = useState(value.categories)
  const visibleTypes: TransactionType[] = type === 'all' ? ['expense', 'income'] : [type]
  const { categories: userCategories, status } = useCategories()

  const changeType = (next: TransactionFilters['type']) => {
    setType(next)
    if (next !== 'all') setCategories((keys) => keys.filter((k) => k.startsWith(`${next}:`)))
  }

  const toggleCategory = (key: string) =>
    setCategories((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))

  return (
    <BottomSheet
      title="Bộ lọc"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setType('all')
              setCategories([])
            }}
          >
            Đặt lại
          </Button>
          <Button onClick={() => onApply({ ...value, type, categories })}>Áp dụng</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col gap-3">
          <Text variant="label" tone="muted">
            Loại giao dịch
          </Text>
          <SegmentedControl label="Loại giao dịch" options={TYPE_OPTIONS} value={type} onChange={changeType} />
        </div>

        {visibleTypes.map((t) => (
          <div key={t} className="flex flex-col gap-3">
            <Text variant="label" tone="muted">
              {TYPE_HEADINGS[t]}
            </Text>
            <div className="flex flex-wrap gap-2">
              {userCategories.filter((c) => c.type === t).length === 0 && (
                <Text variant="caption" tone="muted">
                  {status === 'loading' ? 'Đang tải danh mục…' : 'Chưa có danh mục.'}
                </Text>
              )}
              {userCategories.filter((c) => c.type === t).map(toCategoryMeta).map(({ name, icon: Icon, color }) => {
                const key = categoryKey(t, name)
                const selected = categories.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCategory(key)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border py-2 pr-3.5 pl-2.5 text-sm font-semibold transition',
                      selected
                        ? 'border-primary bg-primary-soft text-primary-dark'
                        : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    {selected ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <Icon className="size-4" style={{ color }} />
                    )}
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
