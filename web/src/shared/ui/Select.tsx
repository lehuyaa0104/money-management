import type { Ref, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { inputClass } from './fieldStyles'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
  ref?: Ref<HTMLSelectElement>
}

/** Native <select> styled like the text inputs; its own chevron, since the browser's ignores padding. */
export default function Select({ hasError = false, className, ref, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select ref={ref} className={inputClass(hasError, `appearance-none pr-12 ${className ?? ''}`)} {...props} />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}
