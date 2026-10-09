import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { CategoryMeta } from '@/features/categories/meta'
import { ApiError } from '@/shared/api/apiClient'
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
  spent: number
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (limit: number) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}

interface FormValues {
  /** Digits only; shown with thousand separators. */
  limit: string
}

export default function BudgetSheet({ category, limit, spent, onSave, onRemove, onClose }: BudgetSheetProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { limit: limit ? String(limit) : '' },
  })
  const [removing, setRemoving] = useState(false)
  const busy = isSubmitting || removing

  const showError = (err: unknown) =>
    setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })

  const save = async ({ limit: value }: FormValues) => {
    try {
      await onSave(Number(value))
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
      </form>
    </BottomSheet>
  )
}
