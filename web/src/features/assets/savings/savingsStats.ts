import { daysBetween, toISODate } from '@/shared/utils/format'
import type { SavingsAsset } from '../useAssets'

/** Simple interest on actual days / 365, as Vietnamese banks quote term deposits. */
export const interestFor = (principal: number, rate: number, days: number) => Math.round((principal * rate * days) / 100 / 365)

/** Same day `months` later; the 31st becomes the month's last day (31/01 + 1 → 28/02). */
export function addMonthsToDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate()
  return toISODate(new Date(y, m - 1 + months, Math.min(d, lastDay)))
}

export interface SavingsStatus {
  /** Principal now: grows when principal + interest is renewed at maturity. */
  principal: number
  /** Start of the current term (the deposit date, or the last renewal). */
  periodStart: string
  /** End of the current term; null with no term. */
  maturity: string | null
  /** Closed at maturity and that date has passed: no longer earning. */
  closed: boolean
  /** Interest for the whole current term; with no term, what has accrued so far. */
  interest: number
  /** 0–1 through the current term. */
  progress: number
  daysLeft: number | null
}

/**
 * Where a deposit stands on `today`, renewing it at each maturity as the user chose.
 * shortcut: renewals keep the original rate; let the user edit it (or store each term) if banks' rate changes matter.
 */
export function savingsStatus({ details: d }: SavingsAsset, today: string): SavingsStatus {
  let principal = d.amount
  let start = d.openedAt
  if (d.termMonths === 0) {
    const interest = interestFor(principal, d.rate, Math.max(0, daysBetween(start, today)))
    return { principal, periodStart: start, maturity: null, closed: false, interest, progress: 0, daysLeft: null }
  }
  let end = addMonthsToDate(start, d.termMonths)
  while (end <= today && d.onMaturity !== 'close') {
    // Interest paid monthly or up front has already left the deposit; only interest paid at maturity can be renewed.
    if (d.onMaturity === 'rollover_all' && d.interestPayout === 'maturity') principal += interestFor(principal, d.rate, daysBetween(start, end))
    start = end
    end = addMonthsToDate(start, d.termMonths)
  }
  const termDays = daysBetween(start, end)
  return {
    principal,
    periodStart: start,
    maturity: end,
    closed: end <= today,
    interest: interestFor(principal, d.rate, termDays),
    progress: Math.min(1, Math.max(0, daysBetween(start, today) / termDays)),
    daysLeft: Math.max(0, daysBetween(today, end)),
  }
}

/** Interest a deposit earns in about a month; 0 once closed. */
export function savingsMonthlyInterest(a: SavingsAsset, today: string): number {
  const s = savingsStatus(a, today)
  return s.closed ? 0 : Math.round((s.principal * a.details.rate) / 100 / 12)
}
