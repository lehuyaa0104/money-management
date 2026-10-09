import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import Field from './Field'
import { cn } from '@/shared/utils/cn'
import { inputClass } from './fieldStyles'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: LucideIcon
  error?: string
  trailing?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export default function TextField({ label, icon: Icon, error, trailing, id, ref, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field label={label} htmlFor={inputId} error={error}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={inputClass(!!error, cn(Icon && 'pl-12', !!trailing && 'pr-14'))}
          {...inputProps}
        />
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
    </Field>
  )
}
