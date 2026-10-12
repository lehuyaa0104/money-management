import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import CategoryPicker from '@/features/assets/debts/components/CategoryPicker'
import { debtStatus, type DebtEntry } from '@/features/assets/debts/debtStats'
import type { DebtDetails } from '@/features/assets/debts/types'
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
  categoryId: string
  note: string
}

interface DebtEntrySheetProps {
  details: DebtDetails
  kind: DebtEntry['kind']
  /** Existing entry to edit; omit to add one of `kind`. */
  entry?: DebtEntry
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (details: DebtDetails) => Promise<void>
  onClose: () => void
}

const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Borrow more on a debt (with what it was for), or repay principal; edits and deletes either. */
export default function DebtEntrySheet({ details, kind, entry, onSave, onClose }: DebtEntrySheetProps) {
  const borrow = kind === 'borrow'
  const [removing, setRemoving] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      date: entry?.date ?? todayISO(),
      amount: entry ? String(entry.amount) : '',
      categoryId: entry?.kind === 'borrow' ? entry.categoryId : '',
      note: entry?.kind === 'borrow' ? entry.note : '',
    },
  })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const busy = isSubmitting || removing

  // The debt without this entry; the change is checked against it.
  const without: DebtDetails = {
    ...details,
    borrowings: details.borrowings.filter((b) => b.id !== entry?.id),
    payments: details.payments.filter((p) => p.id !== entry?.id),
  }
  const withEntry = (v: FormValues): DebtDetails => {
    const id = entry?.id ?? newId()
    return borrow
      ? { ...without, borrowings: [...without.borrowings, { id, date: v.date, amount: Number(v.amount), categoryId: v.categoryId, note: v.note.trim() }] }
      : { ...without, payments: [...without.payments, { id, date: v.date, amount: Number(v.amount) }] }
  }
  // Repaying can't exceed what's owed without this payment.
  const maxRepay = debtStatus(without, todayISO()).remaining
  // Repayments already made can't end up larger than everything borrowed.
  const overpaid = (d: DebtDetails) => {
    const s = debtStatus(d, todayISO())
    return s.paid > s.borrowed
  }

  const showError = (err: unknown) =>
    setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })

  const submit = async (v: FormValues) => {
    const next = withEntry(v)
    if (overpaid(next)) {
      setError('amount', { message: 'Sau khi sửa, số đã trả sẽ vượt quá tổng số đã vay' })
      return
    }
    try {
      await onSave(next)
    } catch (err) {
      showError(err)
    }
  }

  const remove = async () => {
    if (overpaid(without)) {
      setError('root.server', { message: 'Không thể xóa: số đã trả sẽ vượt quá tổng số đã vay.' })
      return
    }
    setRemoving(true)
    try {
      await onSave(without)
    } catch (err) {
      showError(err)
      setRemoving(false)
    }
  }

  const title = `${entry ? 'Sửa' : 'Thêm'} ${borrow ? 'lần vay thêm' : 'lần trả nợ'}`
  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      footer={
        <div className={entry ? 'grid grid-cols-2 gap-3' : undefined}>
          {entry && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="debt-entry-form" variant={borrow ? 'danger' : 'primary'} disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : entry ? 'Lưu thay đổi' : borrow ? 'Ghi khoản vay' : 'Ghi lần trả'}
          </Button>
        </div>
      }
    >
      <form id="debt-entry-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <TextField
          label={borrow ? 'Ngày vay' : 'Ngày trả'}
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
              if (!(n > 0)) return borrow ? 'Nhập số tiền vay thêm' : 'Nhập số tiền gốc đã trả'
              return borrow || n <= maxRepay || `Tối đa ${formatCurrency(maxRepay)} (số còn nợ)`
            },
          }}
          render={({ field, fieldState }) => (
            <MoneyField
              label={borrow ? 'Số tiền vay thêm' : 'Số tiền gốc đã trả'}
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        {borrow && (
          <>
            <CategoryPicker label="Vay để làm gì (không bắt buộc)" value={categoryId} onChange={(id) => setValue('categoryId', id)} />
            <TextField label="Ghi chú (không bắt buộc)" placeholder="vd: Mua điện thoại" maxLength={100} {...register('note')} />
          </>
        )}
      </form>
    </BottomSheet>
  )
}
