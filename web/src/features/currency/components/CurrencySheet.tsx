import { useEffect, useId, useState } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Field from '@/shared/ui/Field'
import Select from '@/shared/ui/Select'
import Text from '@/shared/ui/Text'
import { listRates, type ExchangeRate } from '../rateApi'

// Rates are quoted in VND whatever the user displays, so they get their own formatter.
const vndFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 })

interface CurrencySheetProps {
  current: string
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (code: string) => Promise<void>
  onClose: () => void
}

/** Picks the display currency from those Vietcombank quotes today. */
export default function CurrencySheet({ current, onSave, onClose }: CurrencySheetProps) {
  const id = useId()
  const [code, setCode] = useState(current)
  const [rates, setRates] = useState<ExchangeRate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listRates(controller.signal).then(setRates, (err: unknown) => {
      if (controller.signal.aborted) return
      setRates([])
      setError(err instanceof ApiError ? err.message : 'Không tải được tỷ giá, vui lòng thử lại')
    })
    return () => controller.abort()
  }, [])

  const rate = rates?.find((r) => r.code === code)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(code)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      title="Tiền tệ hiển thị"
      onClose={onClose}
      footer={
        <Button onClick={save} disabled={saving || rates === null || code === current}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        {error && <Alert>{error}</Alert>}
        <Text tone="muted">
          Số tiền vẫn được lưu bằng VND; app quy đổi theo tỷ giá chuyển khoản của Vietcombank hôm nay để hiển thị, và quy
          đổi ngược khi bạn nhập.
        </Text>
        <Field label="Loại tiền" htmlFor={id}>
          <Select id={id} value={code} onChange={(e) => setCode(e.target.value)} disabled={rates === null}>
            <option value="VND">VND · Việt Nam đồng</option>
            {rates?.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} · {r.name}
              </option>
            ))}
          </Select>
        </Field>
        {rates === null ? (
          <Text variant="caption" tone="muted">
            Đang tải tỷ giá…
          </Text>
        ) : (
          rate && (
            <Text variant="caption" tone="muted">
              Tỷ giá hôm nay: 1 {rate.code} = {vndFormat.format(rate.vnd)}
            </Text>
          )
        )}
      </div>
    </BottomSheet>
  )
}
