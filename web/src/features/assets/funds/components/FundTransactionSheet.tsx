import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { fundPosition } from '@/features/assets/funds/fundStats'
import type { FundDetails, FundTransaction } from '@/features/assets/funds/types'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import TextField from '@/shared/ui/TextField'
import { decimalInput, parseDecimal, todayISO } from '@/shared/utils/format'

interface FormValues {
  date: string
  nav: string
  amount: string
  units: string
}

interface FundTransactionSheetProps {
  /** The fund as it is now, to check a sell against the units held. */
  details: FundDetails
  /** Existing transaction to edit; omit to add one of `type`. */
  tx?: FundTransaction
  type?: FundTransaction['type']
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (tx: FundTransaction) => Promise<void>
  onRemove?: () => Promise<void>
  onClose: () => void
}

const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Buy or sell, entered from the trade confirmation (ngày, NAV, số tiền, số CCQ). */
export default function FundTransactionSheet({ details, tx, type = 'buy', onSave, onRemove, onClose }: FundTransactionSheetProps) {
  const kind = tx?.type ?? type
  const buy = kind === 'buy'
  const [removing, setRemoving] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      date: tx?.date ?? todayISO(),
      nav: decimalInput(tx?.nav ?? 0),
      amount: tx ? String(tx.amount) : '',
      units: decimalInput(tx?.units ?? 0),
    },
  })
  // Units default to amount ÷ NAV until the user types their own (an edited trade keeps its saved units).
  const fillUnits = () => {
    const nav = parseDecimal(getValues('nav'))
    const amount = Number(getValues('amount'))
    if (!tx && !dirtyFields.units && nav > 0 && amount > 0) {
      setValue('units', decimalInput(Math.round((amount / nav) * 100) / 100), { shouldValidate: true })
    }
  }
  const busy = isSubmitting || removing
  const others = details.transactions.filter((t) => t.id !== tx?.id)

  const showError = (err: unknown) =>
    setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })

  const submit = async (v: FormValues) => {
    const next: FundTransaction = {
      id: tx?.id ?? newId(),
      type: kind,
      date: v.date,
      nav: parseDecimal(v.nav),
      amount: Number(v.amount),
      units: parseDecimal(v.units),
    }
    if (fundPosition({ ...details, transactions: [...others, next] }).oversold) {
      setError('units', { message: 'Vượt quá số CCQ đang có tại ngày này' })
      return
    }
    try {
      await onSave(next)
    } catch (err) {
      showError(err)
    }
  }

  const remove = async () => {
    if (!onRemove) return
    // Removing a buy can leave a later sell selling units that were never bought.
    if (fundPosition({ ...details, transactions: others }).oversold) {
      setError('root.server', { message: 'Không thể xóa: một giao dịch bán sau đó sẽ vượt quá số CCQ đang có.' })
      return
    }
    setRemoving(true)
    try {
      await onRemove()
    } catch (err) {
      showError(err)
      setRemoving(false)
    }
  }

  // NAV is a VND price per unit, quoted with up to 2 decimals.
  const navField = (
    <Controller
      name="nav"
      control={control}
      rules={{ validate: (v) => parseDecimal(v) > 0 || 'Nhập NAV' }}
      render={({ field, fieldState }) => (
        <MoneyField
          label="NAV/CCQ"
          fractionDigits={2}
          ref={field.ref}
          name={field.name}
          value={field.value}
          onChange={(v) => {
            field.onChange(v)
            fillUnits()
          }}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  return (
    <BottomSheet
      title={`${tx ? 'Sửa' : 'Thêm'} giao dịch ${buy ? 'mua' : 'bán'} ${details.code}`}
      onClose={onClose}
      footer={
        <div className={onRemove ? 'grid grid-cols-2 gap-3' : undefined}>
          {onRemove && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="fund-tx-form" variant={buy ? 'primary' : 'danger'} disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : tx ? 'Lưu thay đổi' : buy ? 'Thêm giao dịch mua' : 'Thêm giao dịch bán'}
          </Button>
        </div>
      }
    >
      <form id="fund-tx-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <Alert tone="info">Nhập theo xác nhận giao dịch của {details.manager || 'quỹ'} để số liệu khớp.</Alert>
        <TextField
          label="Ngày giao dịch"
          type="date"
          max={todayISO()}
          error={errors.date?.message}
          {...register('date', { validate: (v) => (v !== '' && v <= todayISO()) || 'Không được sau hôm nay' })}
        />
        {navField}
        <Controller
          name="amount"
          control={control}
          rules={{ validate: (v) => Number(v) > 0 || (buy ? 'Nhập số tiền đã trả' : 'Nhập số tiền thực nhận') }}
          render={({ field, fieldState }) => (
            <MoneyField
              label={buy ? 'Số tiền đã trả (gồm phí)' : 'Số tiền thực nhận (sau phí, thuế)'}
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={(v) => {
            field.onChange(v)
            fillUnits()
          }}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextField
          label={buy ? 'Số CCQ nhận được' : 'Số CCQ bán'}
          placeholder="vd: 183,47"
          inputMode="decimal"
          autoComplete="off"
          error={errors.units?.message}
          {...register('units', { validate: (v) => parseDecimal(v) > 0 || 'Số CCQ phải lớn hơn 0' })}
        />
      </form>
    </BottomSheet>
  )
}
