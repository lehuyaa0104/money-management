import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { CalendarDays, ChevronDown, Clock, Tag, type LucideIcon } from 'lucide-react'
import PageHeader from '@/shared/layout/PageHeader'
import AmountKeypad from '@/features/transactions/components/AmountKeypad'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import Toast from '@/shared/ui/Toast'
import { useTransactions } from '@/features/transactions/useTransactions'
import type { TransactionType } from '@/features/transactions/types'
import { pressKey, type KeypadKey } from '@/features/transactions/amountInput'
import { CATEGORY_ICONS, FALLBACK_ICON } from '@/features/categories/icons'
import { useCategories } from '@/features/categories/useCategories'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/utils/cn'
import { formatFullDate, formatNumber, nowTime, toTimestamp, todayISO } from '@/shared/utils/format'

interface FormValues {
  type: TransactionType
  /** Digits only, '' means 0 — driven by the on-screen keypad. */
  amount: string
  /** Category name (unique per type); mapped to its id when saving. */
  category: string
  date: string
  time: string
  note: string
}

const TYPE_OPTIONS: { value: TransactionType; label: string; activeClass: string }[] = [
  { value: 'expense', label: 'Chi tiêu', activeClass: 'text-red-600' },
  { value: 'income', label: 'Thu nhập', activeClass: 'text-primary' },
]

const TYPE_STYLE: Record<TransactionType, { caption: string; sign: string; amount: string; chip: string; save: string }> = {
  expense: { caption: 'Khoản chi', sign: '−', amount: 'text-red-600', chip: 'bg-red-600', save: 'Lưu khoản chi' },
  income: { caption: 'Khoản thu', sign: '+', amount: 'text-primary', chip: 'bg-primary', save: 'Lưu khoản thu' },
}

/** Opens the native picker of an <input type="date|time"> laid over a row. */
function openPicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker()
  } catch {
    // Older browsers: the focused input still opens its picker on tap.
  }
}

function DetailRow({ icon: Icon, iconClass, label, value, children }: {
  icon: LucideIcon
  iconClass: string
  label: string
  value: string
  children: ReactNode
}) {
  return (
    <label className="relative flex cursor-pointer items-center gap-4 px-4 py-3.5">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', iconClass)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" variant="caption" tone="muted" className="block">
          {label}
        </Text>
        <Text as="span" weight="semibold" className="block truncate">
          {value}
        </Text>
      </span>
      <ChevronDown className="size-5 text-gray-400" />
      {children}
    </label>
  )
}

export default function AddTransactionPage() {
  const { createTransaction } = useTransactions()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  // Read the clock once, when the page opens.
  const [defaultValues] = useState<FormValues>(() => {
    const type = params.get('type') === 'income' ? 'income' : 'expense'
    // The category is picked once the user's categories have loaded (see the effect below).
    return { type, amount: '', category: '', date: todayISO(), time: nowTime(), note: '' }
  })

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues,
  })
  // The keypad and chips aren't native inputs, so their fields are registered for validation only.
  useEffect(() => {
    register('amount', { validate: (v) => Number(v) > 0 || 'Vui lòng nhập số tiền' })
    register('category', { validate: (v) => v !== '' || 'Vui lòng chọn danh mục' })
  }, [register])

  const [type, amount, category, date, time] = useWatch({ control, name: ['type', 'amount', 'category', 'date', 'time'] })
  const style = TYPE_STYLE[type]
  const display = formatNumber(Number(amount || 0))

  // The user's own categories (from the API) for the selected type.
  const categories = useCategories()
  const options = categories.categories.filter((c) => c.type === type)
  const optionNames = options.map((c) => c.name).join('\n')

  // After loading or switching type, keep the picked category if this type has it
  // (a name can exist for both), otherwise pick the first one.
  useEffect(() => {
    const names = optionNames ? optionNames.split('\n') : []
    if (!names.includes(getValues('category'))) setValue('category', names[0] ?? '')
  }, [optionNames, getValues, setValue])

  const changeType = (next: TransactionType) => setValue('type', next)

  const [toast, setToast] = useState<{ message: string; key: number } | null>(null)
  // A new key remounts the toast, restarting its timer when tapped again.
  const showToast = (message: string) => setToast((t) => ({ message, key: (t?.key ?? 0) + 1 }))
  const hideToast = useCallback(() => setToast(null), [])
  const noCategoryMessage = `Bạn chưa có danh mục ${type === 'income' ? 'thu nhập' : 'chi tiêu'} nào, hãy thêm danh mục trước`

  // Save stays enabled so a tap always explains what's missing, in screen order.
  const onInvalid = (invalid: FieldErrors<FormValues>) => {
    if (invalid.amount) showToast(invalid.amount.message ?? 'Vui lòng nhập số tiền')
    else if (invalid.category) showToast(options.length === 0 ? noCategoryMessage : 'Vui lòng chọn danh mục')
    else if (invalid.date) showToast(invalid.date.message ?? 'Vui lòng chọn ngày')
  }

  const onKey = (key: KeypadKey) => setValue('amount', pressKey(getValues('amount'), key), { shouldValidate: true })

  const onSubmit = async (values: FormValues) => {
    const categoryId = options.find((c) => c.name === values.category)?.id
    if (!categoryId) {
      showToast(options.length === 0 ? noCategoryMessage : 'Vui lòng chọn danh mục')
      return
    }
    try {
      await createTransaction({
        type: values.type,
        amount: Number(values.amount),
        categoryId,
        date: values.date,
        note: values.note.trim(),
        occurredAt: toTimestamp(values.date, values.time),
      })
    } catch (err) {
      // Nothing was saved; keep what the user typed so they can retry.
      setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
      return
    }
    // Return to where the user came from; opened directly, land on home.
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      noValidate
      className="mx-auto flex h-dvh max-w-120 flex-col bg-white"
    >
      {/* Fixed top: header, type switch and the amount being typed. */}
      <div className="shrink-0">
        <PageHeader title="Giao dịch mới" back centered closeIcon />
        <div className="px-5">
          <SegmentedControl label="Loại giao dịch" options={TYPE_OPTIONS} value={type} onChange={changeType} />
        </div>
        <div className="px-5 pt-6 pb-7 text-center">
          <Text variant="caption" tone="muted">
            {style.caption}
          </Text>
          <p
            aria-live="polite"
            className={cn(
              'mt-1 font-bold tracking-tight',
              style.amount,
              display.length > 13 ? 'text-3xl' : display.length > 9 ? 'text-4xl' : 'text-5xl',
            )}
          >
            {style.sign}
            {display}
            <span className="ml-1 align-top text-[0.55em]">₫</span>
          </p>
        </div>
      </div>

      {/* Scrollable bottom panel. */}
      <div className="pb-safe flex-1 overflow-y-auto rounded-t-4xl bg-gray-50 px-5 pt-6">
        <Text variant="label" tone="muted">
          Danh mục
        </Text>
        {categories.status === 'loading' && categories.categories.length === 0 ? (
          <Text variant="caption" tone="muted" className="mt-3">
            Đang tải danh mục…
          </Text>
        ) : categories.status === 'error' ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
            <Text variant="caption" tone="danger">
              {categories.error}
            </Text>
            <button type="button" onClick={categories.retry} className="shrink-0 text-sm font-bold text-primary">
              Thử lại
            </button>
          </div>
        ) : options.length === 0 ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
            <Text variant="caption" tone="subtle">
              Bạn chưa có danh mục {type === 'income' ? 'thu nhập' : 'chi tiêu'} nào.
            </Text>
            <Link to={`/categories?type=${type}`} className="shrink-0 text-sm font-bold text-primary">
              Thêm danh mục
            </Link>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Danh mục" className="mt-3 flex flex-wrap gap-2">
            {options.map(({ id, name, icon }) => {
              const selected = name === category
              const Icon = CATEGORY_ICONS[icon] ?? FALLBACK_ICON
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setValue('category', name)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2.5 font-semibold transition',
                    selected ? cn('border-transparent text-white', style.chip) : 'border-gray-200 bg-white text-gray-600',
                  )}
                >
                  <Icon className="size-4" />
                  {name}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-6 divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white">
          <DetailRow
            icon={CalendarDays}
            iconClass="bg-primary-soft text-primary"
            label="Ngày"
            value={date ? formatFullDate(date) : 'Chọn ngày'}
          >
            <input
              type="date"
              max={todayISO()}
              aria-label="Ngày"
              onClick={openPicker}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              {...register('date', { required: 'Vui lòng chọn ngày' })}
            />
          </DetailRow>
          <DetailRow icon={Clock} iconClass="bg-orange-50 text-orange-500" label="Giờ" value={time || '--:--'}>
            <input
              type="time"
              aria-label="Giờ"
              onClick={openPicker}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              {...register('time')}
            />
          </DetailRow>
        </div>
        {errors.date && (
          <Text variant="caption" tone="danger" className="mt-2">
            {errors.date.message}
          </Text>
        )}

        <label className="mt-4 flex items-center gap-4 rounded-3xl border border-gray-100 bg-white px-4 py-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gray-50 text-gray-400">
            <Tag className="size-5" />
          </span>
          <input
            placeholder="Thêm ghi chú…"
            aria-label="Ghi chú"
            maxLength={100}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-gray-300"
            {...register('note')}
          />
        </label>

        <div className="mt-6">
          <AmountKeypad onKey={onKey} />
        </div>

        {errors.root?.server && (
          <div className="mt-5">
            <Alert>{errors.root.server.message}</Alert>
          </div>
        )}

        <Button
          type="submit"
          variant={type === 'expense' ? 'danger' : 'primary'}
          disabled={isSubmitting}
          className="mt-5 mb-4"
        >
          {isSubmitting ? 'Đang lưu…' : style.save}
        </Button>
      </div>

      {toast && <Toast key={toast.key} message={toast.message} onClose={hideToast} />}
    </form>
  )
}
