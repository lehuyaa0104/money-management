import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { AssetInput, InvestmentAsset, InvestmentKind } from '@/features/assets/useAssets'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import TextField from '@/shared/ui/TextField'
import { decimalInput, parseDecimal } from '@/shared/utils/format'

const KIND_OPTIONS: { value: InvestmentKind; label: string }[] = [
  { value: 'stock', label: 'Cổ phiếu / ETF' },
  { value: 'crypto', label: 'Crypto' },
]

interface FormValues {
  kind: InvestmentKind
  name: string
  symbol: string
  /** Typed text; Vietnamese keyboards use "," as the decimal separator. */
  quantity: string
  costPrice: string
  price: string
}

interface InvestmentFormSheetProps {
  /** Existing holding to edit; omit to add one of `kind`. */
  asset?: InvestmentAsset
  kind?: InvestmentKind
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (input: AssetInput) => Promise<void>
  onRemove?: () => Promise<void>
  onClose: () => void
}

/** Stocks (ETFs included) and crypto share one form for now: symbol, quantity, cost and current price. */
export default function InvestmentFormSheet({ asset, kind = 'stock', onSave, onRemove, onClose }: InvestmentFormSheetProps) {
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
      kind: asset?.kind ?? kind,
      name: asset?.name ?? '',
      symbol: asset?.details.symbol ?? '',
      quantity: decimalInput(asset?.details.quantity ?? 0),
      costPrice: asset ? String(asset.details.costPrice) : '',
      price: asset ? String(asset.details.price) : '',
    },
  })
  const selectedKind = useWatch({ control, name: 'kind' })
  const busy = isSubmitting || removing

  // Saving can only fail when the browser's storage is full or blocked.
  const showError = () => setError('root.server', { message: 'Không lưu được trên trình duyệt này, vui lòng thử lại' })

  const submit = async (v: FormValues) => {
    try {
      await onSave({
        kind: v.kind,
        name: v.name,
        details: { symbol: v.symbol, quantity: parseDecimal(v.quantity), costPrice: Number(v.costPrice), price: Number(v.price) },
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

  const money = (name: 'costPrice' | 'price', label: string, required: string) => (
    <Controller
      name={name}
      control={control}
      rules={{ validate: (v) => Number(v) > 0 || required }}
      render={({ field, fieldState }) => (
        <MoneyField label={label} ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )}
    />
  )

  return (
    <BottomSheet
      title={asset ? 'Sửa khoản đầu tư' : 'Thêm khoản đầu tư'}
      onClose={onClose}
      footer={
        <div className={onRemove ? 'grid grid-cols-2 gap-3' : undefined}>
          {onRemove && (
            <Button variant="outline" className="text-red-600" onClick={remove} disabled={busy}>
              {removing ? 'Đang xóa…' : 'Xóa'}
            </Button>
          )}
          <Button type="submit" form="investment-form" disabled={busy}>
            {isSubmitting ? 'Đang lưu…' : asset ? 'Lưu thay đổi' : 'Thêm'}
          </Button>
        </div>
      }
    >
      <form id="investment-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        <SegmentedControl label="Loại tài sản" options={KIND_OPTIONS} value={selectedKind} onChange={(k) => setValue('kind', k)} />
        <div className="grid grid-cols-[2fr_3fr] gap-3">
          <TextField
            label="Mã"
            placeholder="vd: FPT"
            maxLength={15}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            error={errors.symbol?.message}
            {...register('symbol', { validate: (v) => v.trim() !== '' || 'Nhập mã' })}
          />
          <TextField label="Tên (không bắt buộc)" placeholder="vd: FPT Corp" maxLength={40} {...register('name')} />
        </div>
        <TextField
          label="Số lượng"
          placeholder="vd: 100 hoặc 0,05"
          inputMode="decimal"
          autoComplete="off"
          error={errors.quantity?.message}
          {...register('quantity', { validate: (v) => parseDecimal(v) > 0 || 'Số lượng phải lớn hơn 0' })}
        />
        {money('costPrice', 'Giá vốn mỗi đơn vị', 'Vui lòng nhập giá vốn')}
        {money('price', 'Giá hiện tại mỗi đơn vị', 'Vui lòng nhập giá hiện tại')}
      </form>
    </BottomSheet>
  )
}
