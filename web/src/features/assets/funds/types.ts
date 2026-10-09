/** One buy or sell, as printed on the fund's trade confirmation (xác nhận giao dịch). */
export interface FundTransaction {
  id: string
  type: 'buy' | 'sell'
  /** Trading date, YYYY-MM-DD. */
  date: string
  /** Fund units (CCQ) bought or sold; can be fractional. */
  units: number
  /** VND paid for a buy (fees included), or received for a sell (after fees and tax). */
  amount: number
  /** NAV per unit on that trading date. */
  nav: number
}

/** An open-ended fund holding (chứng chỉ quỹ mở). */
export interface FundDetails {
  /** Fund code, e.g. DCDS. */
  code: string
  /** Fund manager, e.g. Dragon Capital. */
  manager: string
  /** Last NAV per unit the user entered, and its date; a newer transaction's NAV takes over. */
  nav: number
  navDate: string
  transactions: FundTransaction[]
}
