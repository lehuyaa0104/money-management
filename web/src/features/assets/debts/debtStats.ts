import { daysBetween } from '@/shared/utils/format'
import type { DebtDetails, DebtPayment } from './types'

/** Newest first. */
export const newestFirst = (payments: DebtPayment[]) => [...payments].sort((a, b) => b.date.localeCompare(a.date))

export interface DebtStatus {
  paid: number
  /** Principal still owed; 0 once paid off. */
  remaining: number
  /** 0–1 of the principal repaid. */
  progress: number
  /** Interest a month at `rate` on what's left (simple, for reference). */
  monthlyInterest: number
  /** Days until the due date (negative once past it); null with no due date or once paid off. */
  daysLeft: number | null
}

export function debtStatus(d: DebtDetails, today: string): DebtStatus {
  const paid = d.payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(0, d.amount - paid)
  return {
    paid,
    remaining,
    progress: d.amount > 0 ? Math.min(1, paid / d.amount) : 0,
    monthlyInterest: Math.round((remaining * d.rate) / 100 / 12),
    daysLeft: d.dueDate && remaining > 0 ? daysBetween(today, d.dueDate) : null,
  }
}
