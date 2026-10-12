import { daysBetween } from '@/shared/utils/format'
import type { DebtBorrowing, DebtDetails, DebtPayment } from './types'

/** One line of a debt's history: more borrowed, or principal repaid. */
export type DebtEntry = ({ kind: 'borrow' } & DebtBorrowing) | ({ kind: 'repay' } & DebtPayment)

/** Borrowings and payments together, newest first. */
export function debtHistory(d: DebtDetails): DebtEntry[] {
  return [
    ...d.borrowings.map((b) => ({ kind: 'borrow' as const, ...b })),
    ...d.payments.map((p) => ({ kind: 'repay' as const, ...p })),
  ].sort((a, b) => b.date.localeCompare(a.date))
}

export interface DebtStatus {
  /** First loan plus every later borrowing. */
  borrowed: number
  paid: number
  /** Principal still owed; 0 once paid off. */
  remaining: number
  /** 0–1 of what was borrowed that's been repaid. */
  progress: number
  /** Interest a month at `rate` on what's left (simple, for reference). */
  monthlyInterest: number
  /** Days until the due date (negative once past it); null with no due date or once paid off. */
  daysLeft: number | null
}

export function debtStatus(d: DebtDetails, today: string): DebtStatus {
  const borrowed = d.amount + d.borrowings.reduce((sum, b) => sum + b.amount, 0)
  const paid = d.payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(0, borrowed - paid)
  return {
    borrowed,
    paid,
    remaining,
    progress: borrowed > 0 ? Math.min(1, paid / borrowed) : 0,
    monthlyInterest: Math.round((remaining * d.rate) / 100 / 12),
    daysLeft: d.dueDate && remaining > 0 ? daysBetween(today, d.dueDate) : null,
  }
}
