import type { ComponentProps } from 'react'
import { formatMoneyInput, parseMoneyInput } from '@/shared/utils/format'
import Text from './Text'
import TextField from './TextField'

type MoneyFieldProps = Omit<ComponentProps<typeof TextField>, 'value' | 'onChange' | 'trailing' | 'inputMode'> & {
  /** Digits only, '' when empty; with `fractionDigits`, a decimal comma may follow ("25430,12"). */
  value: string
  onChange: (value: string) => void
  /** Allow this many decimals, e.g. 2 for a fund's NAV per unit. Default 0: whole đồng. */
  fractionDigits?: number
}

/** VND amount input: digits only, shown grouped ("1.500.000 ₫"). */
export default function MoneyField({ value, onChange, fractionDigits = 0, ...props }: MoneyFieldProps) {
  return (
    <TextField
      inputMode={fractionDigits ? 'decimal' : 'numeric'}
      autoComplete="off"
      placeholder="0"
      {...props}
      value={formatMoneyInput(value)}
      onChange={(e) => onChange(parseMoneyInput(e.target.value, fractionDigits))}
      trailing={
        <Text as="span" tone="muted" weight="semibold" className="pr-3">
          ₫
        </Text>
      }
    />
  )
}
