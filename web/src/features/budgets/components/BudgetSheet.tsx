import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { BudgetPriority } from '@/features/budgets/budgetApi'
import { BUDGET_PRIORITIES } from '@/features/budgets/budgetPriority'
import type { CategoryMeta } from '@/features/categories/meta'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils/format'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import MoneyField from '@/shared/ui/MoneyField'

interface BudgetSheetProps {
  category: CategoryMeta
  /** Current limit, or undefined when setting one for the first time. */
  limit?: number
  /** Current priority; new budgets start as "important". */
  priority?: BudgetPriority
  spent: number
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (limit: number, priority: BudgetPriority) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}

interface FormValues {
  /** Digits only; shown with thousand separators. */
  limit: string
  priority: BudgetPriority
}

export default function BudgetSheet({ category, limit, priority = 'important', spent, onSave, onRemove, onClose }: BudgetSheetProps) {
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { limit: limit ? String(limit) : '', priority },
  })
  const selected = useWatch({ control, name: 'priority' })
  const [removing, setRemoving] = useState(false)
  const priorityLabelId = useId()
  const busy = isSubmitting || removing

  const showError = (err: unknown) =>
    setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })

  const save = async ({ limit: value, priority: chosen }: FormValues) => {
    try {
      await onSave(Number(value), chosen)
    } catch (err) {
      showError(err)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      await onRemove()
    } catch (err) {
      showError(err)
      setRemoving(false)
    }
  }
  const Icon = category.icon

  return (
    <BottomSheet
      title={limit ? 'Sửa ngân sách' : 'Đặt ngân sách'}
      onClose={onClose}
      footer={
        <div className={limit ? 'grid grid-cols-2 gap-3' : undefined}>
          {limit !== undefined && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="budget-form" disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      }
    >
      <form
        id="budget-form"
        noValidate
        onSubmit={handleSubmit(save)}
        className="flex flex-col gap-5 pt-2"
      >
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-2xl"
            style={{ backgroundColor: `${category.color}1a`, color: category.color }}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <Text weight="bold">{category.name}</Text>
            <Text variant="caption" tone="muted">
              Đã chi tháng này: {formatCurrency(spent)}
            </Text>
          </div>
        </div>

        <Controller
          name="limit"
          control={control}
          rules={{ validate: (v) => Number(v) > 0 || 'Vui lòng nhập hạn mức lớn hơn 0' }}
          render={({ field, fieldState }) => (
            <MoneyField
              ref={field.ref}
              name={field.name}
              label="Hạn mức mỗi tháng"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <div className="flex flex-col gap-2">
          <Text as="span" variant="label" tone="muted" id={priorityLabelId}>
            Mức ưu tiên
          </Text>
          <div role="radiogroup" aria-labelledby={priorityLabelId} className="flex flex-col gap-2">
            {BUDGET_PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={selected === p.value}
                onClick={() => setValue('priority', p.value)}
                className={cn(
                  'rounded-2xl border-2 px-4 py-3 text-left transition',
                  selected === p.value ? 'border-primary bg-primary-soft/50' : 'border-gray-100 bg-white',
                )}
              >
                <Text as="span" weight="bold" className="block">
                  {p.label}
                </Text>
                <Text as="span" variant="caption" tone="muted" className="block">
                  {p.hint}
                </Text>
              </button>
            ))}
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
