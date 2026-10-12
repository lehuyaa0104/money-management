import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { DEBT_TYPES } from '@/features/assets/debts/debtOptions'
import type { DebtType } from '@/features/assets/debts/types'
import { useAssets } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'
import { cn } from '@/shared/utils/cn'
import { decimalInput, parseDecimal, todayISO } from '@/shared/utils/format'

interface FormValues {
  type: DebtType
  lender: string
  name: string
  amount: string
  rate: string
  startDate: string
  dueDate: string
}

const DEBTS = '/budget/savings/debts'

/** Adds a debt, or edits its terms at /debts/:id/edit (repayments are on the debt's own page). */
export default function DebtFormPage() {
  const { assets, create, update } = useAssets()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const typeLabelId = useId()
  const found = id ? assets.find((a) => a.id === id) : undefined
  const editing = found?.kind === 'debt' ? found : undefined
  const [saving, setSaving] = useState(false)

  const d = editing?.details
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      type: d?.type ?? 'bank',
      lender: d?.lender ?? '',
      name: editing?.name ?? '',
      amount: d ? String(d.amount) : '',
      rate: decimalInput(d?.rate ?? 0),
      startDate: d?.startDate ?? todayISO(),
      dueDate: d?.dueDate ?? '',
    },
  })
  const type = useWatch({ control, name: 'type' })
  const paid = d?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0

  const submit = async (v: FormValues) => {
    setSaving(true)
    const details = {
      type: v.type,
      lender: v.lender,
      amount: Number(v.amount),
      rate: v.rate.trim() === '' ? 0 : parseDecimal(v.rate),
      startDate: v.startDate,
      dueDate: v.dueDate,
      payments: d?.payments ?? [],
    }
    try {
      if (editing) {
        await update(editing.id, { kind: 'debt', name: v.name, details })
        if (location.key === 'default') navigate(`${DEBTS}/${editing.id}`, { replace: true })
        else navigate(-1)
      } else {
        const newId = await create({ kind: 'debt', name: v.name, details })
        navigate(`${DEBTS}/${newId}`, { replace: true })
      }
    } catch (err) {
      setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
      setSaving(false)
    }
  }

  // A stale edit link (e.g. the debt was deleted on another tab).
  if (id && !editing) return <Navigate to="/budget/savings" replace />

  return (
    <div className="pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50">
      <PageHeader title={editing ? 'Sửa khoản nợ' : 'Khoản nợ mới'} back centered closeIcon fallback="/budget/savings" />
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 px-5 pt-2 pb-6">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}

        <div className="flex flex-col gap-2">
          <Text as="span" variant="label" tone="muted" id={typeLabelId}>
            Loại khoản nợ
          </Text>
          <div role="radiogroup" aria-labelledby={typeLabelId} className="grid grid-cols-2 gap-2">
            {DEBT_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setValue('type', value)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold transition',
                  type === value ? 'border-primary bg-primary-soft/50 text-gray-900' : 'border-transparent bg-white text-gray-600 shadow-sm',
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>

        <TextField
          label={type === 'personal' ? 'Người cho vay' : 'Ngân hàng / bên cho vay'}
          placeholder={type === 'personal' ? 'vd: Anh Nam' : 'vd: TPBank'}
          maxLength={40}
          error={errors.lender?.message}
          {...register('lender', { validate: (v) => v.trim() !== '' || 'Vui lòng nhập bên cho vay' })}
        />
        <TextField label="Tên khoản nợ (không bắt buộc)" placeholder="vd: Vay mua xe" maxLength={60} {...register('name')} />

        <Controller
          name="amount"
          control={control}
          rules={{
            validate: (v) => {
              const n = Number(v)
              if (!(n > 0)) return 'Vui lòng nhập số tiền vay'
              return n >= paid || 'Không được nhỏ hơn số đã trả'
            },
          }}
          render={({ field, fieldState }) => (
            <MoneyField label="Số tiền vay (gốc)" ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
          )}
        />

        <TextField
          label="Lãi suất (%/năm, không bắt buộc)"
          placeholder="vd: 9,5"
          inputMode="decimal"
          autoComplete="off"
          error={errors.rate?.message}
          {...register('rate', {
            validate: (v) => {
              if (v.trim() === '') return true
              const n = parseDecimal(v)
              return (n >= 0 && n <= 100) || 'Từ 0 đến 100%'
            },
          })}
        />

        <TextField
          label="Ngày vay"
          type="date"
          max={todayISO()}
          error={errors.startDate?.message}
          {...register('startDate', { validate: (v) => (v !== '' && v <= todayISO()) || 'Không được sau hôm nay' })}
        />
        <TextField
          label="Hạn trả (không bắt buộc)"
          type="date"
          error={errors.dueDate?.message}
          {...register('dueDate', { validate: (v, values) => v === '' || v >= values.startDate || 'Phải sau ngày vay' })}
        />

        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm khoản nợ'}
        </Button>
      </form>
    </div>
  )
}
