import { useId, useState } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Field from '@/shared/ui/Field'
import Text from '@/shared/ui/Text'
import Select from '@/shared/ui/Select'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

interface CycleSheetProps {
  startDay: number
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (day: number) => Promise<void>
  onClose: () => void
}

export default function CycleSheet({ startDay, onSave, onClose }: CycleSheetProps) {
  const id = useId()
  const [day, setDay] = useState(startDay)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(day)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      title="Chu kỳ tháng"
      onClose={onClose}
      footer={
        <Button onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        {error && <Alert>{error}</Alert>}
        <Text tone="muted">
          Ngân sách và thống kê sẽ tính từ ngày này đến hết ngày trước đó của tháng sau, ví dụ nhận lương ngày 25 thì
          chọn 25. Tháng ít ngày hơn sẽ bắt đầu vào ngày cuối tháng.
        </Text>
        <Field label="Ngày bắt đầu" htmlFor={id}>
          <Select id={id} value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d === 1 ? 'Ngày 1 (theo tháng dương lịch)' : `Ngày ${d}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </BottomSheet>
  )
}
