import { useState, type ComponentProps } from 'react'
import { currencySymbol, fromInputText, inputDecimals, toInputText } from '@/shared/utils/currency'
import { formatMoneyInput, parseMoneyInput } from '@/shared/utils/format'
import Text from './Text'
import TextField from './TextField'

type MoneyFieldProps = Omit<ComponentProps<typeof TextField>, 'value' | 'onChange' | 'trailing' | 'inputMode'> & {
  /** The amount in VND: digits only, '' when empty; with `fractionDigits`, a decimal comma may follow ("25430,12"). */
  value: string
  onChange: (value: string) => void
  /** VND decimals to keep, e.g. 2 for a fund's NAV per unit. Default 0: whole đồng. */
  fractionDigits?: number
}

/**
 * Amount input, shown and typed in the user's display currency ("1.500.000 ₫", "58,39 US$")
 * while the form keeps the amount in VND, converted at today's rate.
 */
export default function MoneyField({ value, onChange, fractionDigits = 0, ...props }: MoneyFieldProps) {
  const decimals = inputDecimals(fractionDigits)
  // The typed text is kept as is (e.g. "12," while typing decimals); it's only rebuilt
  // from `value` when the form changes the amount itself.
  const [field, setField] = useState(() => ({ value, text: toInputText(value, fractionDigits) }))
  let text = field.text
  if (field.value !== value) {
    text = toInputText(value, fractionDigits)
    setField({ value, text })
  }

  const change = (raw: string) => {
    const typed = parseMoneyInput(raw, decimals)
    const next = fromInputText(typed, fractionDigits)
    setField({ value: next, text: typed })
    onChange(next)
  }

  return (
    <TextField
      inputMode={decimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      placeholder="0"
      {...props}
      value={formatMoneyInput(text)}
      onChange={(e) => change(e.target.value)}
      trailing={
        <Text as="span" tone="muted" weight="semibold" className="pr-3">
          {currencySymbol()}
        </Text>
      }
    />
  )
}
