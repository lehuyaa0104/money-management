/** How interest is paid: at maturity, every month, or up front when the deposit is made. */
export type InterestPayout = 'maturity' | 'monthly' | 'upfront'
/** What the bank does at maturity: renew principal + interest, renew the principal only, or close the deposit. */
export type OnMaturity = 'rollover_all' | 'rollover_principal' | 'close'

/** A bank term deposit (sổ tiết kiệm). */
export interface SavingsDetails {
  bank: string
  /** Principal deposited, VND. */
  amount: number
  /** Percent per year, e.g. 5.2. */
  rate: number
  /** 0 = no term (không kỳ hạn). */
  termMonths: number
  /** Deposit date, YYYY-MM-DD. */
  openedAt: string
  interestPayout: InterestPayout
  onMaturity: OnMaturity
}
