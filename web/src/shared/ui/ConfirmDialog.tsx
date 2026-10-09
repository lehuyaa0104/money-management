import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ApiError } from '@/shared/api/apiClient'
import Button from './Button'
import Text from './Text'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel: string
  /** May be async; the dialog shows a pending state and any error, and stays open on failure. */
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

/**
 * Centered modal asking the user to confirm a destructive action.
 * Mount to open, unmount to close. Built on <dialog> for focus trapping and Escape.
 */
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const close = () => {
    if (!pending) onClose()
  }

  const confirm = async () => {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại')
      setPending(false)
    }
  }

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="animate-dialog-in fixed inset-0 m-auto h-fit w-[calc(100%-2.5rem)] max-w-sm rounded-3xl bg-white p-6 text-gray-900 backdrop:bg-black/40"
    >
      <div className="flex flex-col items-center text-center">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-7" />
        </span>
        <Text id={titleId} as="h2" variant="subheading" className="mt-4">
          {title}
        </Text>
        <Text id={messageId} variant="caption" tone="subtle" className="mt-2">
          {message}
        </Text>
        {error && (
          <Text role="alert" variant="caption" tone="danger" className="mt-3">
            {error}
          </Text>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={close} disabled={pending} autoFocus>
          Hủy
        </Button>
        <Button variant="danger" onClick={confirm} disabled={pending}>
          {pending ? 'Đang xoá…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
