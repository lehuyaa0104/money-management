import type { InterestPayout, OnMaturity } from './types'

/** Banks offered as logos; any other name can still be typed. `code` is the VietQR bank code. */
export const BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'VBA', name: 'Agribank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'CAKE', name: 'Cake' },
  { code: 'TIMO', name: 'Timo' },
]

/**
 * Logo of a listed bank (matched by name, case-insensitively); undefined for others.
 * shortcut: logos load from VietQR's public CDN, so they're missing offline or if it changes; bundle them in /public if that matters.
 */
export function bankLogo(name: string): string | undefined {
  const bank = BANKS.find((b) => b.name.toLowerCase() === name.trim().toLowerCase())
  return bank && `https://api.vietqr.io/img/${bank.code}.png`
}

/** 0 = no term. */
export const TERM_MONTHS = [0, 1, 3, 6, 9, 12, 18, 24, 36]

export const termLabel = (months: number) => (months === 0 ? 'Không kỳ hạn' : `${months} tháng`)

export const PAYOUT_OPTIONS: { value: InterestPayout; label: string }[] = [
  { value: 'maturity', label: 'Cuối kỳ' },
  { value: 'monthly', label: 'Hằng tháng' },
  { value: 'upfront', label: 'Đầu kỳ' },
]

export const ON_MATURITY_OPTIONS: { value: OnMaturity; label: string }[] = [
  { value: 'rollover_all', label: 'Tái tục gốc + lãi' },
  { value: 'rollover_principal', label: 'Tái tục gốc' },
  { value: 'close', label: 'Tất toán' },
]
