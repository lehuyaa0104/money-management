import { cn } from '@/shared/utils/cn'

// 16px text (text-base) stops iOS Safari from zooming in on focus.
export function inputClass(hasError: boolean, extra?: string): string {
  return cn(
    'h-14 w-full rounded-2xl border bg-gray-50 px-4 text-base text-gray-900 outline-none transition',
    'placeholder:text-gray-300 focus:bg-white focus:ring-4',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-gray-200 focus:border-primary focus:ring-primary/10',
    extra,
  )
}
