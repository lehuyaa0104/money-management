import type { Transaction } from './types'
import { UNKNOWN_CATEGORY_COLOR, type CategoryLookup } from '@/features/categories/meta'
import { addDays, addMonths, formatDayMonth, formatMonthLabel, formatWeekday } from '@/shared/utils/format'

export function sumBy(transactions: Transaction[], type: Transaction['type']): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0)
}

export function totalBalance(transactions: Transaction[]): number {
  return sumBy(transactions, 'income') - sumBy(transactions, 'expense')
}

/** "YYYY-MM" of an ISO date. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function inMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === month)
}

/** A budgeting month that starts on the user's cycle start day (e.g. payday). */
export interface Cycle {
  /** "YYYY-MM" the cycle starts in; identifies it (the API's `month`). */
  month: string
  /** First day, inclusive. */
  start: string
  /** First day of the next cycle, exclusive. */
  end: string
}

/**
 * The cycle starting in `month` on `startDay`, or on the month's last day if it's
 * shorter (31 → 30/04, 28/02). Must match the API's domain.CycleRange.
 */
export function cycleOf(month: string, startDay: number): Cycle {
  const startIn = (m: string) => `${m}-${String(Math.min(startDay, daysInMonthCount(m))).padStart(2, '0')}`
  return { month, start: startIn(month), end: startIn(addMonths(month, 1)) }
}

/** The cycle a YYYY-MM-DD date falls in. */
export function cycleAt(isoDate: string, startDay: number): Cycle {
  const cycle = cycleOf(monthKey(isoDate), startDay)
  return isoDate < cycle.start ? cycleOf(addMonths(cycle.month, -1), startDay) : cycle
}

export function inCycle(transactions: Transaction[], cycle: Cycle): Transaction[] {
  return transactions.filter((t) => t.date >= cycle.start && t.date < cycle.end)
}

const isCalendarMonth = (cycle: Cycle) => cycle.start.endsWith('-01')

/** "Tháng 10/2026", or "25/09 – 24/10" for a cycle not on calendar months. */
export function formatCycleLabel(cycle: Cycle): string {
  return isCalendarMonth(cycle)
    ? formatMonthLabel(cycle.month)
    : `${formatDayMonth(cycle.start)} – ${formatDayMonth(addDays(cycle.end, -1))}`
}

/** Chart axis label: "T10", or the start date "25/09" for a cycle not on calendar months. */
export function shortCycleLabel(cycle: Cycle): string {
  return isCalendarMonth(cycle) ? `T${Number(cycle.month.slice(5))}` : formatDayMonth(cycle.start)
}

export interface DailyPoint {
  date: string
  weekday: string
  label: string
  amount: number
}

export interface WeeklySpending {
  days: DailyPoint[]
  total: number
  previousTotal: number
}

/** Expenses for the 7 days ending `today`, plus the 7 days before for comparison. */
export function weeklySpending(transactions: Transaction[], today: string): WeeklySpending {
  const start = addDays(today, -6)
  const previousStart = addDays(today, -13)
  const expenses = transactions.filter((t) => t.type === 'expense')

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    return {
      date,
      weekday: formatWeekday(date),
      label: formatDayMonth(date),
      amount: expenses.filter((t) => t.date === date).reduce((sum, t) => sum + t.amount, 0),
    }
  })

  const previousTotal = expenses
    .filter((t) => t.date >= previousStart && t.date < start)
    .reduce((sum, t) => sum + t.amount, 0)

  return { days, total: days.reduce((sum, d) => sum + d.amount, 0), previousTotal }
}

export interface CategorySlice {
  name: string
  color: string
  amount: number
}

/** Label of the slice the smallest categories are folded into. */
export const REST_SLICE = 'Còn lại'

/**
 * Expense totals per category, largest first, colored with each category's own
 * color. Past `maxSlices` categories, the smallest are folded into one gray
 * "Còn lại" slice so a donut never shows more than `maxSlices` segments.
 */
export function expensesByCategory(transactions: Transaction[], lookup: CategoryLookup, maxSlices = 6): CategorySlice[] {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }

  const slices = [...totals]
    .map(([name, amount]) => ({ name, amount, color: lookup('expense', name).color }))
    .sort((a, b) => b.amount - a.amount)
  if (slices.length <= maxSlices) return slices

  const kept = slices.slice(0, maxSlices - 1)
  const rest = slices.slice(maxSlices - 1).reduce((sum, s) => sum + s.amount, 0)
  return [...kept, { name: REST_SLICE, color: UNKNOWN_CATEGORY_COLOR, amount: rest }]
}

export interface DayGroup {
  date: string
  transactions: Transaction[]
}

/** Newest first, grouped by calendar day. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
  const groups: DayGroup[] = []
  for (const t of sorted) {
    const last = groups[groups.length - 1]
    if (last?.date === t.date) last.transactions.push(t)
    else groups.push({ date: t.date, transactions: [t] })
  }
  return groups
}

export interface DayTotals {
  expense: number
  income: number
  count: number
}

/** Per-day totals for the given transactions, keyed by YYYY-MM-DD. */
export function totalsByDay(transactions: Transaction[]): Map<string, DayTotals> {
  const totals = new Map<string, DayTotals>()
  for (const t of transactions) {
    const day = totals.get(t.date) ?? { expense: 0, income: 0, count: 0 }
    day[t.type] += t.amount
    day.count += 1
    totals.set(t.date, day)
  }
  return totals
}

export function daysInMonthCount(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber, 0).getDate()
}

export interface MonthTotals extends Cycle {
  income: number
  expense: number
}

export function monthlyTotals(transactions: Transaction[], cycles: Cycle[]): MonthTotals[] {
  return cycles.map((cycle) => {
    const list = inCycle(transactions, cycle)
    return { ...cycle, income: sumBy(list, 'income'), expense: sumBy(list, 'expense') }
  })
}

export interface SpendingItem {
  name: string
  category: string
  amount: number
}

/**
 * Where the money went, largest first: expenses grouped by their note (the
 * closest thing to a merchant), or by category when there's no note.
 */
export function topSpending(transactions: Transaction[], limit = 5): SpendingItem[] {
  const groups = new Map<string, SpendingItem>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const name = t.note.trim() || t.category
    const key = name.toLowerCase()
    const item = groups.get(key) ?? { name, category: t.category, amount: 0 }
    item.amount += t.amount
    groups.set(key, item)
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount).slice(0, limit)
}

export function largestExpense(transactions: Transaction[]): Transaction | undefined {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce<Transaction | undefined>((max, t) => (!max || t.amount > max.amount ? t : max), undefined)
}

/** Average spending per cycle, over the cycles that have any transaction. */
export function monthlyAverageExpense(transactions: Transaction[], startDay: number): number {
  const months = new Set(transactions.map((t) => cycleAt(t.date, startDay).month))
  return months.size === 0 ? 0 : sumBy(transactions, 'expense') / months.size
}

/**
 * Consecutive days with at least one transaction, ending today — or yesterday,
 * so the streak isn't shown as broken before today's first entry.
 */
export function loggingStreak(transactions: Transaction[], today: string): number {
  const days = new Set(transactions.map((t) => t.date))
  let day = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}
