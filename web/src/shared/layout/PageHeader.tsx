import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronLeft, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import Text from '@/shared/ui/Text'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Show a back button (for pages opened on top of a tab). */
  back?: boolean
  action?: ReactNode
  /** Center the title between the back button and an equal-width spacer. */
  centered?: boolean
  /** Where "back" goes when the page was opened directly (no in-app history). */
  fallback?: string
  /** Show ✕ instead of ‹ — for full-screen tasks such as creating a transaction. */
  closeIcon?: boolean
}

export default function PageHeader({ title, subtitle, back = false, action, centered = false, fallback = '/', closeIcon = false }: PageHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Opened directly (no in-app history): going "back" would leave the app.
  const goBack = () => (location.key === 'default' ? navigate(fallback, { replace: true }) : navigate(-1))

  return (
    <header className="pt-safe-header flex items-center gap-3 px-5 pb-3">
      {back && (
        <button
          type="button"
          onClick={goBack}
          aria-label={closeIcon ? 'Đóng' : 'Quay lại'}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-100"
        >
          {closeIcon ? <X className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      )}
      {/* Tab pages get a large title; pages opened on top of them a smaller one. */}
      <div className={cn('min-w-0 flex-1', centered && 'text-center')}>
        <Text variant={back ? 'heading' : 'title'} as="h1" className={cn(!back && 'text-[1.75rem]')}>
          {title}
        </Text>
        {subtitle && (
          <Text tone="muted" className="mt-0.5">
            {subtitle}
          </Text>
        )}
      </div>
      {action ?? (centered && back && <span aria-hidden="true" className="size-11 shrink-0" />)}
    </header>
  )
}
