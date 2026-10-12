export type DebtType = 'bank' | 'credit_card' | 'personal' | 'other'

/** Principal repaid on a date; interest paid isn't tracked. */
export interface DebtPayment {
  id: string
  date: string // YYYY-MM-DD
  amount: number // VND
}

/** Money the user owes (khoản nợ). What's left is derived from the payments. */
export interface DebtDetails {
  type: DebtType
  /** Bank or person lent by. */
  lender: string
  /** Principal borrowed, VND. */
  amount: number
  /** Percent per year, for reference; 0 = none. */
  rate: number
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD, or '' with no deadline. */
  dueDate: string
  payments: DebtPayment[]
}
