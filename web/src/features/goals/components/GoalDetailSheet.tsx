import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Minus, Pencil, Plus } from 'lucide-react'
import type { Goal } from '@/features/goals/useGoals'
import { ApiError } from '@/shared/api/apiClient'
import { formatCurrency } from '@/shared/utils/format'
import { GOAL_ACCENTS } from '@/features/goals/goalColors'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import Text from '@/shared/ui/Text'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

interface GoalDetailSheetProps {
  goal: Goal
  /** Async; on failure the sheet shows the error and keeps the amount. */
  onDeposit: (amount: number) => Promise<void>
  onWithdraw: (amount: number) => Promise<void>
  onEdit: () => void
  onDelete: () => Promise<void>
  onClose: () => void
}

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')

export default function GoalDetailSheet({ goal, onDeposit, onWithdraw, onEdit, onDelete, onClose }: GoalDetailSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, setPending] = useState<1 | -1 | null>(null)
  const accent = GOAL_ACCENTS[goal.color]
  const progress = Math.min(goal.saved / goal.target, 1)
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ amount: string }>({ defaultValues: { amount: '' } })

  const apply = (direction: 1 | -1) =>
    handleSubmit(async ({ amount }) => {
      const value = Number(amount)
      if (!(value > 0)) return setError('amount', { message: 'Vui lòng nhập số tiền' })
      if (direction === -1 && value > goal.saved) {
        return setError('amount', { message: `Chỉ có thể rút tối đa ${formatCurrency(goal.saved)}` })
      }
      setPending(direction)
      try {
        await (direction === 1 ? onDeposit(value) : onWithdraw(value))
        reset({ amount: '' })
      } catch (err) {
        setError('root.server', { message: messageOf(err) })
      } finally {
        setPending(null)
      }
    })

  const remove = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete()
    } catch (err) {
      setDeleteError(messageOf(err))
      setDeleting(false)
    }
  }

  return (
    <BottomSheet
      title={goal.name}
      onClose={onClose}
      footer={
        confirmingDelete ? (
          <div className="flex flex-col gap-3">
            {deleteError && <Alert>{deleteError}</Alert>}
            <Text variant="caption" tone="subtle" className="text-center">
              Xóa mục tiêu “{goal.name}”? Bạn sẽ không thể hoàn tác.
            </Text>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Hủy
              </Button>
              <Button variant="danger" onClick={remove} disabled={deleting}>
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onEdit} disabled={isSubmitting}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button variant="outline" className="text-red-600" onClick={() => setConfirmingDelete(true)} disabled={isSubmitting}>
              Xóa
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <div>
          <div className="flex items-end justify-between gap-3">
            <Text as="p" variant="heading">
              {formatCurrency(goal.saved)}
            </Text>
            <Text variant="caption" tone="muted">
              / {formatCurrency(goal.target)}
            </Text>
          </div>
          <div aria-hidden="true" className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: accent.base }} />
          </div>
          <Text variant="caption" weight="bold" className="mt-2" style={{ color: accent.text }}>
            Hoàn thành {percentFormatter.format(progress)}
          </Text>
        </div>

        <form noValidate onSubmit={apply(1)} className="flex flex-col gap-3">
          {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
          <Controller
            name="amount"
            control={control}
            render={({ field, fieldState }) => (
              <MoneyField label="Cập nhật số tiền" ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={apply(-1)} disabled={isSubmitting}>
              <Minus className="size-4" /> {pending === -1 ? 'Đang rút…' : 'Rút ra'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="size-4" /> {pending === 1 ? 'Đang nạp…' : 'Nạp vào'}
            </Button>
          </div>
        </form>
      </div>
    </BottomSheet>
  )
}
