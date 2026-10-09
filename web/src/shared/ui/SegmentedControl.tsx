import { cn } from '@/shared/utils/cn'

interface SegmentedControlProps<T extends string> {
  /** `activeClass` overrides the selected option's text color. */
  options: { value: T; label: string; activeClass?: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}

export default function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-gray-100 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-xl py-2.5 text-sm font-semibold transition',
            value === o.value ? cn('bg-white text-gray-900 shadow-sm', o.activeClass) : 'text-gray-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
