import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Transaction } from '@/features/transactions/types'
import { useCategories } from '@/features/categories/useCategories'
import { ApiError } from '@/shared/api/apiClient'
import { formatCurrency, formatDate, formatTime } from '@/shared/utils/format'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'

interface TransactionDetailSheetProps {
  transaction: Transaction
  /** May be async; on failure the sheet shows the error and stays open. */
  onDelete: (id: string) => Promise<void> | void
  onClose: () => void
}

export default function TransactionDetailSheet({ transaction: t, onDelete, onClose }: TransactionDetailSheetProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onDelete(t.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
      setDeleting(false)
    }
  }
  const meta = useCategories().lookup(t.type, t.category)
  const Icon = meta.icon

  const rows: [string, string][] = [
    ['Loại', t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'],
    ['Danh mục', t.category],
    ['Ngày', `${formatDate(t.date)} · ${formatTime(t.createdAt)}`],
  ]
  if (t.note) rows.push(['Ghi chú', t.note])

  return (
    <BottomSheet
      title="Chi tiết giao dịch"
      onClose={onClose}
      footer={
        confirming ? (
          <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}
            <Text variant="caption" tone="subtle" className="text-center">
              Xóa giao dịch này? Bạn sẽ không thể hoàn tác.
            </Text>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
                Hủy
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)} className="text-red-600">
            <Trash2 className="size-5" /> Xóa giao dịch
          </Button>
        )
      }
    >
      <div className="flex flex-col items-center pt-2 text-center">
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-3xl"
          style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
        >
          <Icon className="size-7" />
        </span>
        <Text weight="semibold" className="mt-3">
          {t.note || t.category}
        </Text>
        <Text variant="title" as="p" tone={t.type === 'income' ? 'primary' : 'default'} className="mt-1">
          {t.type === 'income' ? '+' : '−'}
          {formatCurrency(t.amount)}
        </Text>
      </div>

      <dl className="mt-6 divide-y divide-gray-100 rounded-2xl bg-gray-50 px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3">
            <dt className="shrink-0">
              <Text as="span" variant="caption" tone="muted">
                {label}
              </Text>
            </dt>
            <dd className="min-w-0 text-right wrap-break-word">
              <Text as="span" variant="caption" weight="semibold">
                {value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </BottomSheet>
  )
}
