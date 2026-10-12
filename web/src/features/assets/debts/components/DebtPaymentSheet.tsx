import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { DebtDetails, DebtPayment } from '@/features/assets/debts/types'
import { debtStatus } from '@/features/assets/debts/debtStats'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import TextField from '@/shared/ui/TextField'
import { formatCurrency, todayISO } from '@/shared/utils/format'

interface FormValues {
  date: string
  amount: string
}

interface DebtPaymentSheetProps {
  details: DebtDetails
  /** Existing payment to edit; omit to add one. */
  payment?: DebtPayment
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (payment: DebtPayment) => Promise<void>
  onRemove?: () => Promise<void>
  onClose: () => void
}

const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** A repayment of principal; it can't take the total repaid past what was borrowed. */
export default function DebtPaymentSheet({ details, payment, onSave, onRemove, onClose }: DebtPaymentSheetProps) {
  const [removing, setRemoving] = useState(false)
  // What's left without this payment: the most it can be.
  const others = { ...details, payments: details.payments.filter((p) => p.id !== payment?.id) }
  const maxAmount = debtStatus(others, todayISO()).remaining
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { date: payment?.date ?? todayISO(), amount: payment ? String(payment.amount) : '' },
  })
  const busy = isSubmitting || removing

  const showError = (err: unknown) =>
    setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })

  const submit = async (v: FormValues) => {
    try {
      await onSave({ id: payment?.id ?? newId(), date: v.date, amount: Number(v.amount) })
    } catch (err) {
      showError(err)
    }
  }

  const remove = async () => {
    if (!onRemove) return
    setRemoving(true)
    try {
      await onRemove()
    } catch (err) {
      showError(err)
      setRemoving(false)
    }
  }

  return (
    <BottomSheet
      title={payment ? 'Sửa lần trả nợ' : 'Trả nợ'}
      onClose={onClose}
      footer={
        <div className={onRemove ? 'grid grid-cols-2 gap-3' : undefined}>
          {onRemove && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="debt-payment-form" disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : payment ? 'Lưu thay đổi' : 'Ghi lần trả'}
          </Button>
        </div>
      }
    >
      <form id="debt-payment-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <TextField
          label="Ngày trả"
          type="date"
          min={details.startDate}
          max={todayISO()}
          error={errors.date?.message}
          {...register('date', { validate: (v) => (v !== '' && v <= todayISO()) || 'Không được sau hôm nay' })}
        />
        <Controller
          name="amount"
          control={control}
          rules={{
            validate: (v) => {
              const n = Number(v)
              if (!(n > 0)) return 'Nhập số tiền gốc đã trả'
              return n <= maxAmount || `Tối đa ${formatCurrency(maxAmount)} (số còn nợ)`
            },
          }}
          render={({ field, fieldState }) => (
            <MoneyField
              label="Số tiền gốc đã trả"
              ref={field.ref}
              name={field.name}
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
