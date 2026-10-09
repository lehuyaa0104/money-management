import { daysBetween } from '@/shared/utils/format'
import { NAV_STALE_DAYS } from './fundOptions'
import type { FundDetails, FundTransaction } from './types'

/** Oldest first; same-day trades keep the order they were entered. */
export const byDate = (txs: FundTransaction[]) => [...txs].sort((a, b) => a.date.localeCompare(b.date))

/** The NAV to value the holding at: the user's last entry, or a newer transaction's. */
export function currentNav(d: FundDetails): { nav: number; date: string } {
  const latest = byDate(d.transactions).at(-1)
  return latest && latest.date > d.navDate ? { nav: latest.nav, date: latest.date } : { nav: d.nav, date: d.navDate }
}

export interface FundPosition {
  units: number
  /** What the units still held cost (average cost method). */
  cost: number
  /** cost / units; 0 when nothing is held. */
  averageCost: number
  nav: number
  navDate: string
  value: number
  /** Value minus cost of what's still held. */
  gain: number
  gainRate: number | null
  /** Gain locked in by sells: amount received minus the average cost of the units sold. */
  realizedGain: number
  /** A sell took more units than were held at that point: the history is wrong. */
  oversold: boolean
}

// Float noise from fractional units (183.47 + 0.1 …) shouldn't read as "still holding 0.0000001".
const EPSILON = 1e-6

export function fundPosition(d: FundDetails): FundPosition {
  let units = 0
  let cost = 0
  let realizedGain = 0
  let oversold = false
  for (const t of byDate(d.transactions)) {
    if (t.type === 'buy') {
      units += t.units
      cost += t.amount
      continue
    }
    if (t.units > units + EPSILON) oversold = true
    const sold = Math.min(t.units, units)
    const soldCost = units > 0 ? (cost * sold) / units : 0
    realizedGain += t.amount - soldCost
    units -= sold
    cost -= soldCost
    if (units < EPSILON) units = cost = 0
  }
  const { nav, date } = currentNav(d)
  const value = Math.round(units * nav)
  return {
    units,
    cost: Math.round(cost),
    averageCost: units > 0 ? cost / units : 0,
    nav,
    navDate: date,
    value,
    gain: value - Math.round(cost),
    gainRate: cost > 0 ? (value - cost) / cost : null,
    realizedGain: Math.round(realizedGain),
    oversold,
  }
}

export const isNavStale = (navDate: string, today: string) => daysBetween(navDate, today) > NAV_STALE_DAYS
