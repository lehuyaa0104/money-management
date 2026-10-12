const MAX_DIGITS = 12 // whole part, up to 999 tỷ

/** Keypad keys. Whole-unit currencies (VND, JPY…) get a quick "000"; others a decimal comma. */
export const keypadKeys = (decimals: number) => ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals ? ',' : '000', '0', 'back'] as const
export type KeypadKey = ReturnType<typeof keypadKeys>[number]

/** Next amount text (no leading zeros, at most `decimals` decimals) after pressing `key`. */
export function pressKey(amount: string, key: KeypadKey, decimals = 0): string {
  if (key === 'back') return amount.slice(0, -1)
  if (key === ',') return decimals && !amount.includes(',') ? `${amount || '0'},` : amount
  const [whole, fraction] = amount.split(',')
  if (fraction !== undefined) return fraction.length + key.length > decimals ? amount : amount + key
  if (amount === '' && (key === '0' || key === '000')) return ''
  return whole.length + key.length > MAX_DIGITS ? amount : amount + key
}
