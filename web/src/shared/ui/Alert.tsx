import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface AlertProps {
  tone?: 'error' | 'info'
  children: ReactNode
}

export default function Alert({ tone = 'error', children }: AlertProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-4 py-3 text-sm',
        tone === 'error' ? 'bg-red-50 text-red-600' : 'bg-primary-soft text-primary-dark',
      )}
    >
      {children}
    </p>
  )
}
