/**
 * The currency amounts are shown and typed in. Amounts are always stored in VND; with
 * another currency they're converted at today's rate for display, and back when saved.
 * Set once when the app starts (CurrencyProvider); changing it reloads the page.
 */
export interface DisplayCurrency {
  code: string
  /** VND per unit; 1 for VND. */
  vndPerUnit: number
}

let current: DisplayCurrency = { code: 'VND', vndPerUnit: 1 }
let formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export function setDisplayCurrency(currency: DisplayCurrency): void {
  current = currency
  formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency.code })
}

export const displayCurrency = (): DisplayCurrency => current
export const isVnd = () => current.code === 'VND'

/** Decimals the currency is written with: 0 for VND, JPY, KRW; 2 for USD, EUR. */
export const currencyDecimals = () => formatter.resolvedOptions().maximumFractionDigits ?? 0

/** "₫", "US$", "€" … */
export const currencySymbol = () => formatter.formatToParts(0).find((p) => p.type === 'currency')?.value ?? current.code

/** A stored VND amount in the display currency (unrounded). */
export const fromVnd = (vnd: number) => vnd / current.vndPerUnit

/** An amount typed in the display currency, as the whole VND to store. */
export const toVnd = (amount: number) => Math.round(amount * current.vndPerUnit)

/** A VND amount written in the display currency: "1.234.567 ₫", "48,05 US$". */
export const formatInDisplayCurrency = (vnd: number) => formatter.format(fromVnd(vnd))

const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals
// Kept here rather than imported from format.ts, which imports this module.
const toText = (n: number) => (n ? String(n).replace('.', ',') : '')
const fromText = (text: string) => (text.trim() === '' ? NaN : Number(text.replace(',', '.')))

/**
 * A stored VND amount as the text of an input in the display currency: "1250000" in VND,
 * "48,66" in USD; '' for nothing. `storedDecimals` > 0 for VND values kept with decimals
 * (a fund's NAV), which then get that many more decimals in a foreign currency.
 */
export function toInputText(stored: string, storedDecimals = 0): string {
  if (isVnd()) return stored
  const vnd = fromText(stored)
  return vnd > 0 ? toText(round(fromVnd(vnd), currencyDecimals() + storedDecimals)) : ''
}

/** Typed text in the display currency → the stored VND text (whole đồng unless `storedDecimals`). */
export function fromInputText(typed: string, storedDecimals = 0): string {
  if (isVnd()) return typed
  const amount = fromText(typed)
  if (!(amount > 0)) return ''
  return storedDecimals ? toText(round(amount * current.vndPerUnit, storedDecimals)) : String(toVnd(amount))
}

/** Decimals an input accepts: the currency's, plus `storedDecimals` more outside VND. */
export const inputDecimals = (storedDecimals = 0) => (isVnd() ? storedDecimals : currencyDecimals() + storedDecimals)
