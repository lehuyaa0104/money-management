export type DebtType = 'bank' | 'credit_card' | 'personal' | 'other'

/** Principal repaid on a date; interest paid isn't tracked. */
export interface DebtPayment {
  id: string
  date: string // YYYY-MM-DD
  amount: number // VND
}

/** More borrowed on the same debt, e.g. one credit card purchase. */
export interface DebtBorrowing {
  id: string
  date: string // YYYY-MM-DD
  amount: number // VND
  /** What it was for: an expense category id, or ''. */
  categoryId: string
  note: string
}

/** Money the user owes (khoản nợ). What's left is derived from borrowings and payments. */
export interface DebtDetails {
  type: DebtType
  /** Bank or person lent by. */
  lender: string
  /** First loan, VND; 0 for e.g. a credit card whose purchases are added as borrowings. */
  amount: number
  /** What the first loan was for: an expense category id, or ''. */
  categoryId: string
  /** Percent per year, for reference; 0 = none. */
  rate: number
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD, or '' with no deadline. */
  dueDate: string
  borrowings: DebtBorrowing[]
  payments: DebtPayment[]
}
