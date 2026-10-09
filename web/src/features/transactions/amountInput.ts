// VND has no decimals, so the usual "." key becomes a quick "000".
export const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'] as const
export type KeypadKey = (typeof KEYPAD_KEYS)[number]

const MAX_DIGITS = 12 // up to 999 tỷ

/** Next amount (digits only, no leading zeros) after pressing `key`. */
export function pressKey(amount: string, key: KeypadKey): string {
  if (key === 'back') return amount.slice(0, -1)
  if (amount === '' && (key === '0' || key === '000')) return ''
  const next = amount + key
  return next.length > MAX_DIGITS ? amount : next
}
