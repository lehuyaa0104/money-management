import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { Asset, AssetInput, AssetKind } from '@/features/assets/useAssets'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import TextField from '@/shared/ui/TextField'

const KIND_OPTIONS: { value: AssetKind; label: string }[] = [
  { value: 'stock', label: 'Cổ phiếu' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'savings', label: 'Tiết kiệm' },
]

interface FormValues {
  kind: AssetKind
  name: string
  symbol: string
  /** Typed text; Vietnamese keyboards use "," as the decimal separator. */
  quantity: string
  costPrice: string
  price: string
  balance: string
  rate: string
}

/** "0,05" or "0.05" → 0.05; NaN when it isn't a number. */
const parseDecimal = (v: string) => (v.trim() === '' ? NaN : Number(v.trim().replace(',', '.')))

const digits = (n: number) => (n ? String(n) : '')

interface AssetFormSheetProps {
  /** Existing asset to edit; omit to add a new one. */
  asset?: Asset
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (input: AssetInput) => Promise<void>
  onRemove?: () => Promise<void>
  onClose: () => void
}

export default function AssetFormSheet({ asset, onSave, onRemove, onClose }: AssetFormSheetProps) {
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
      kind: asset?.kind ?? 'stock',
      name: asset?.name ?? '',
      symbol: asset?.symbol ?? '',
      quantity: asset?.quantity ? String(asset.quantity).replace('.', ',') : '',
      costPrice: digits(asset?.costPrice ?? 0),
      price: digits(asset?.price ?? 0),
      balance: digits(asset?.balance ?? 0),
      rate: asset?.rate ? String(asset.rate).replace('.', ',') : '',
    },
  })
  const kind = useWatch({ control, name: 'kind' })
  const savings = kind === 'savings'
  const busy = isSubmitting || removing

  // Saving can only fail when the browser's storage is full or blocked.
  const showError = () => setError('root.server', { message: 'Không lưu được trên trình duyệt này, vui lòng thử lại' })

  const submit = async (v: FormValues) => {
    try {
      await onSave({
        kind: v.kind,
        name: v.name,
        symbol: v.symbol,
        quantity: savings ? 0 : parseDecimal(v.quantity),
        costPrice: Number(v.costPrice || 0),
        price: Number(v.price || 0),
        balance: Number(v.balance || 0),
        rate: savings ? parseDecimal(v.rate) : 0,
      })
    } catch {
      showError()
    }
  }

  const remove = async () => {
    if (!onRemove) return
    setRemoving(true)
    try {
      await onRemove()
    } catch {
      showError()
      setRemoving(false)
    }
  }

  // Only the visible kind's fields are validated.
  const money = (name: 'costPrice' | 'price' | 'balance', label: string, rule?: (v: string) => true | string) => (
    <Controller
      key={name}
      name={name}
      control={control}
      rules={{ validate: rule }}
      render={({ field, fieldState }) => (
        <MoneyField label={label} ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )}
    />
  )

  return (
    <BottomSheet
      title={asset ? 'Sửa tài sản' : 'Thêm tài sản'}
      onClose={onClose}
      footer={
        <div className={onRemove ? 'grid grid-cols-2 gap-3' : undefined}>
          {onRemove && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="asset-form" disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : asset ? 'Lưu thay đổi' : 'Thêm'}
          </Button>
        </div>
      }
    >
      <form id="asset-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <SegmentedControl label="Loại tài sản" options={KIND_OPTIONS} value={kind} onChange={(k) => setValue('kind', k)} />

        {savings ? (
          <>
            <TextField
              label="Tên tài khoản"
              placeholder="vd: Techcombank kỳ hạn 12 tháng"
              maxLength={40}
              error={errors.name?.message}
              {...register('name', { validate: (v) => !savings || v.trim() !== '' || 'Vui lòng nhập tên tài khoản' })}
            />
            {money('balance', 'Số dư hiện tại')}
            <TextField
              label="Lãi suất (%/năm)"
              placeholder="vd: 5,2"
              inputMode="decimal"
              autoComplete="off"
              error={errors.rate?.message}
              {...register('rate', {
                validate: (v) => {
                  if (!savings) return true
                  const n = parseDecimal(v)
                  return (n >= 0 && n <= 100) || 'Lãi suất từ 0 đến 100%'
                },
              })}
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_3fr] gap-3">
              <TextField
                label="Mã"
                placeholder="vd: FPT"
                maxLength={15}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                error={errors.symbol?.message}
                {...register('symbol', { validate: (v) => savings || v.trim() !== '' || 'Nhập mã' })}
              />
              <TextField label="Tên (không bắt buộc)" placeholder="vd: FPT Corp" maxLength={40} {...register('name')} />
            </div>
            <TextField
              label="Số lượng"
              placeholder="vd: 100 hoặc 0,05"
              inputMode="decimal"
              autoComplete="off"
              error={errors.quantity?.message}
              {...register('quantity', { validate: (v) => savings || parseDecimal(v) > 0 || 'Số lượng phải lớn hơn 0' })}
            />
            {money('costPrice', 'Giá vốn mỗi đơn vị', (v) => savings || Number(v) > 0 || 'Vui lòng nhập giá vốn')}
            {money('price', 'Giá hiện tại mỗi đơn vị', (v) => savings || Number(v) > 0 || 'Vui lòng nhập giá hiện tại')}
          </>
        )}
      </form>
    </BottomSheet>
  )
}
