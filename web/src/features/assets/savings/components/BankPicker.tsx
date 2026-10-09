import { useId, useState } from 'react'
import { PenLine } from 'lucide-react'
import BankLogo from '@/features/assets/savings/components/BankLogo'
import { BANKS } from '@/features/assets/savings/savingsOptions'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'
import { cn } from '@/shared/utils/cn'

interface BankPickerProps {
  value: string
  onChange: (bank: string) => void
  error?: string
}

/** Logo grid of common banks, plus "Khác" to type any other name. */
export default function BankPicker({ value, onChange, error }: BankPickerProps) {
  const labelId = useId()
  const listed = BANKS.some((b) => b.name === value)
  // "Khác" stays open once chosen, even while its text box is still empty.
  const [other, setOther] = useState(value !== '' && !listed)

  const tile = (selected: boolean) =>
    cn(
      'flex h-14 items-center justify-center rounded-2xl border-2 bg-white p-1.5 transition',
      selected ? 'border-primary ring-4 ring-primary/10' : 'border-transparent shadow-sm',
    )

  return (
    <div className="flex flex-col gap-2">
      <Text as="span" variant="label" tone="muted" id={labelId}>
        Ngân hàng
      </Text>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
        {BANKS.map((b) => {
          const selected = !other && value === b.name
          return (
            <button
              key={b.code}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={b.name}
              onClick={() => {
                setOther(false)
                onChange(b.name)
              }}
              className={tile(selected)}
            >
              <BankLogo bank={b.name} className="size-full rounded-xl border-0" />
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={other}
          onClick={() => {
            setOther(true)
            if (listed) onChange('')
          }}
          className={cn(tile(other), 'gap-1.5 text-sm font-semibold text-gray-600')}
        >
          <PenLine aria-hidden="true" className="size-4" /> Khác
        </button>
      </div>
      {other && (
        <TextField
          label="Tên ngân hàng"
          placeholder="vd: Bac A Bank"
          maxLength={40}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </div>
  )
}
