import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  /** Small green dot, e.g. when a filter is active. */
  badge?: boolean
}

export default function IconButton({ icon: Icon, label, badge = false, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'relative grid size-12 shrink-0 place-items-center rounded-full bg-white text-gray-700 shadow-sm active:bg-gray-100',
        className,
      )}
      {...props}
    >
      <Icon className="size-5" />
      {badge && (
        <span aria-hidden="true" className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-primary ring-2 ring-white" />
      )}
    </button>
  )
}
