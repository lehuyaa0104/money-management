import { debtStatus } from './debts/debtStats'
import { fundPosition, type DatedNav } from './funds/fundStats'
import { savingsMonthlyInterest, savingsStatus } from './savings/savingsStats'
import type { Asset, AssetKind, DebtAsset, FundAsset, SavingsAsset } from './useAssets'

export const isFund = (a: Asset): a is FundAsset => a.kind === 'fund'
export const isSavings = (a: Asset): a is SavingsAsset => a.kind === 'savings'
export const isDebt = (a: Asset): a is DebtAsset => a.kind === 'debt'

export interface PortfolioSummary {
  /** What's owned minus what's owed. */
  netWorth: number
  invested: number
  savings: number
  /** Principal still owed on debts. */
  debts: number
  /** Funds' value minus what was paid for the units still held. */
  gain: number
  /** gain / cost; null with no investments. */
  gainRate: number | null
  monthlyInterest: number
  /** Value of each kind; debts as the amount still owed. */
  byKind: Record<AssetKind, number>
}

/** `navs` are the funds' published NAVs by code. */
export function summarize(assets: Asset[], today: string, navs: Record<string, DatedNav> = {}): PortfolioSummary {
  const byKind: Record<AssetKind, number> = { fund: 0, savings: 0, debt: 0 }
  let cost = 0
  let interest = 0
  for (const a of assets) {
    if (isFund(a)) {
      const p = fundPosition(a.details, navs[a.details.code])
      byKind.fund += p.value
      cost += p.cost
    } else if (isDebt(a)) {
      byKind.debt += debtStatus(a.details, today).remaining
    } else {
      byKind.savings += savingsStatus(a, today).principal
      interest += savingsMonthlyInterest(a, today)
    }
  }
  const invested = byKind.fund
  return {
    netWorth: invested + byKind.savings - byKind.debt,
    invested,
    savings: byKind.savings,
    debts: byKind.debt,
    gain: invested - cost,
    gainRate: cost > 0 ? (invested - cost) / cost : null,
    monthlyInterest: interest,
    byKind,
  }
}
