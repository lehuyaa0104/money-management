import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

type Variant = 'primary' | 'outline' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-lg text-white shadow-lg shadow-primary/25 active:bg-primary-dark',
  outline: 'border border-gray-200 bg-white text-base text-gray-700 active:bg-gray-50',
  danger: 'bg-red-600 text-base text-white shadow-lg shadow-red-600/20 active:bg-red-700',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export default function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-60',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
