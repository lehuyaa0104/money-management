import { useEffect } from 'react'

interface ToastProps {
  message: string
  /** Called after a few seconds; unmount the toast then. Pass a stable function. */
  onClose: () => void
}

/** Brief message floating at the top of the screen. Remount it (new `key`) to show it again. */
export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      role="alert"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 flex justify-center px-5"
    >
      <p className="max-w-110 rounded-2xl bg-gray-900/90 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
        {message}
      </p>
    </div>
  )
}
