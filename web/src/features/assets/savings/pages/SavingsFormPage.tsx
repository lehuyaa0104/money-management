import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import BankPicker from '@/features/assets/savings/components/BankPicker'
import SavingsPreview from '@/features/assets/savings/components/SavingsPreview'
import { ON_MATURITY_OPTIONS, PAYOUT_OPTIONS, TERM_MONTHS, termLabel } from '@/features/assets/savings/savingsOptions'
import type { InterestPayout, OnMaturity, SavingsDetails } from '@/features/assets/savings/types'
import { useAssets } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import Field from '@/shared/ui/Field'
import MoneyField from '@/shared/ui/MoneyField'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import Select from '@/shared/ui/Select'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'
import { decimalInput, parseDecimal, todayISO } from '@/shared/utils/format'

interface FormValues {
  bank: string
  name: string
  amount: string
  rate: string
  termMonths: string
  openedAt: string
  interestPayout: InterestPayout
  onMaturity: OnMaturity
}

const LIST = '/budget/savings'

/** Adds a bank deposit, or edits one at /budget/savings/accounts/:id. */
export default function SavingsFormPage() {
  const { assets, create, update, remove } = useAssets()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const ids = { term: useId(), onMaturity: useId() }
  const found = id ? assets.find((a) => a.id === id) : undefined
  const editing = found?.kind === 'savings' ? found : undefined
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const d = editing?.details
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
      bank: d?.bank ?? '',
      name: editing?.name ?? '',
      amount: d ? String(d.amount) : '',
      rate: decimalInput(d?.rate ?? 0),
      termMonths: String(d?.termMonths ?? 12),
      openedAt: d?.openedAt ?? todayISO(),
      interestPayout: d?.interestPayout ?? 'maturity',
      onMaturity: d?.onMaturity ?? 'rollover_all',
    },
  })
  const values = useWatch({ control })
  const hasTerm = values.termMonths !== '0'

  // Back to the list; opened directly, land on it anyway.
  const leave = () => (location.key === 'default' ? navigate(LIST, { replace: true }) : navigate(-1))

  const toDetails = (v: Partial<FormValues>): SavingsDetails => ({
    bank: v.bank ?? '',
    amount: Number(v.amount || 0),
    rate: parseDecimal(v.rate ?? ''),
    termMonths: Number(v.termMonths),
    openedAt: v.openedAt ?? '',
    interestPayout: v.interestPayout ?? 'maturity',
    onMaturity: v.onMaturity ?? 'close',
  })

  const submit = async (v: FormValues) => {
    const input = { kind: 'savings' as const, name: v.name, details: toDetails(v) }
    try {
      if (editing) await update(editing.id, input)
      else await create(input)
    } catch {
      // Saving can only fail when the browser's storage is full or blocked.
      setError('root.server', { message: 'Không lưu được trên trình duyệt này, vui lòng thử lại' })
      return
    }
    leave()
  }

  // A stale edit link (e.g. the deposit was deleted on another tab).
  if (id && !editing) return <Navigate to={LIST} replace />

  const preview = toDetails(values)
  const previewReady = preview.amount > 0 && preview.rate >= 0 && !!preview.openedAt && preview.openedAt <= todayISO()

  return (
    <div className="pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50">
      <PageHeader title={editing ? 'Sửa sổ tiết kiệm' : 'Sổ tiết kiệm mới'} back centered closeIcon fallback={LIST} />
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 px-5 pt-2 pb-6">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}

        <Controller
          name="bank"
          control={control}
          rules={{ validate: (v) => v.trim() !== '' || 'Vui lòng chọn ngân hàng' }}
          render={({ field, fieldState }) => <BankPicker value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
        />

        <TextField label="Tên sổ (không bắt buộc)" placeholder="vd: Quỹ mua nhà" maxLength={40} {...register('name')} />

        <Controller
          name="amount"
          control={control}
          rules={{ validate: (v) => Number(v) > 0 || 'Vui lòng nhập số tiền gửi' }}
          render={({ field, fieldState }) => (
            <MoneyField label="Số tiền gửi" ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Lãi suất (%/năm)"
            placeholder="vd: 5,2"
            inputMode="decimal"
            autoComplete="off"
            error={errors.rate?.message}
            {...register('rate', {
              validate: (v) => {
                const n = parseDecimal(v)
                return (n >= 0 && n <= 100) || 'Từ 0 đến 100%'
              },
            })}
          />
          <Field label="Kỳ hạn" htmlFor={ids.term}>
            <Select id={ids.term} {...register('termMonths')}>
              {TERM_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {termLabel(m)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <TextField
          label="Ngày gửi"
          type="date"
          max={todayISO()}
          error={errors.openedAt?.message}
          {...register('openedAt', {
            validate: (v) => (v !== '' && v <= todayISO()) || 'Ngày gửi không được sau hôm nay',
          })}
        />

        {hasTerm && (
          <>
            <div className="flex flex-col gap-2">
              <Text as="span" variant="label" tone="muted">
                Nhận lãi
              </Text>
              <SegmentedControl
                label="Nhận lãi"
                options={PAYOUT_OPTIONS}
                value={values.interestPayout ?? 'maturity'}
                onChange={(v) => setValue('interestPayout', v)}
              />
            </div>
            <Field label="Khi đến hạn" htmlFor={ids.onMaturity}>
              <Select id={ids.onMaturity} {...register('onMaturity')}>
                {ON_MATURITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {previewReady && <SavingsPreview details={preview} />}

        <div className={editing ? 'grid grid-cols-2 gap-3' : undefined}>
          {editing && (
            <Button variant="outline" className="text-red-600" onClick={() => setConfirmingDelete(true)} disabled={isSubmitting}>
              Xóa
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm sổ tiết kiệm'}
          </Button>
        </div>
      </form>

      {confirmingDelete && editing && (
        <ConfirmDialog
          title="Xóa sổ tiết kiệm?"
          message="Sổ này sẽ bị xóa khỏi danh sách tài sản. Bạn không thể hoàn tác."
          confirmLabel="Xóa"
          onConfirm={async () => {
            await remove(editing.id)
            leave()
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
