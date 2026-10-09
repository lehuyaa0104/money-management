import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import Text from './Text'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Modal sheet that slides up from the bottom. Mount it to open, unmount to close.
 * Built on <dialog>, so focus trapping and Escape-to-close come from the browser.
 */
export default function BottomSheet({ title, onClose, children, footer }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()

    // Keep the page behind from scrolling while the sheet is up (iOS ignores the backdrop).
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Escape / Android back fire `cancel` synchronously; handle it through React
      // state instead of waiting for the native `close` event, which browsers may
      // defer (e.g. in background tabs).
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={onClose}
      // A click that lands on the <dialog> itself (not its content) is a backdrop tap.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="animate-sheet-up fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-120 rounded-t-4xl bg-white p-0 text-gray-900 backdrop:bg-black/40"
    >
      <div className="pb-safe flex max-h-[85dvh] flex-col">
        <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-gray-200" />
        <header className="flex items-center justify-between px-5 pt-3 pb-2">
          <Text id={titleId} as="h2" variant="subheading">
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 grid size-10 place-items-center rounded-full text-gray-500 active:bg-gray-100"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-gray-100 px-5 pt-4">{footer}</div>}
      </div>
    </dialog>
  )
}
