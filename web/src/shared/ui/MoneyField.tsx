import type { ComponentProps } from 'react'
import { formatNumber } from '@/shared/utils/format'
import Text from './Text'
import TextField from './TextField'

const MAX_DIGITS = 12 // up to 999 tỷ

type MoneyFieldProps = Omit<ComponentProps<typeof TextField>, 'value' | 'onChange' | 'trailing' | 'inputMode'> & {
  /** Digits only, '' when empty. */
  value: string
  onChange: (digits: string) => void
}

/** VND amount input: accepts digits only and shows them grouped ("1.500.000 ₫"). */
export default function MoneyField({ value, onChange, ...props }: MoneyFieldProps) {
  return (
    <TextField
      inputMode="numeric"
      autoComplete="off"
      placeholder="0"
      {...props}
      value={value ? formatNumber(Number(value)) : ''}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS))}
      trailing={
        <Text as="span" tone="muted" weight="semibold" className="pr-3">
          ₫
        </Text>
      }
    />
  )
}
