import { fundPosition } from './funds/fundStats'
import { savingsMonthlyInterest, savingsStatus } from './savings/savingsStats'
import type { Asset, AssetKind, FundAsset, SavingsAsset } from './useAssets'

export const isFund = (a: Asset): a is FundAsset => a.kind === 'fund'
export const isSavings = (a: Asset): a is SavingsAsset => a.kind === 'savings'


export interface PortfolioSummary {
  netWorth: number
  invested: number
  savings: number
  /** Funds' value minus what was paid for the units still held. */
  gain: number
  /** gain / cost; null with no investments. */
  gainRate: number | null
  monthlyInterest: number
  byKind: Record<AssetKind, number>
}

export function summarize(assets: Asset[], today: string): PortfolioSummary {
  const byKind: Record<AssetKind, number> = { fund: 0, savings: 0 }
  let cost = 0
  let interest = 0
  for (const a of assets) {
    if (isFund(a)) {
      const p = fundPosition(a.details)
      byKind.fund += p.value
      cost += p.cost
    } else {
      byKind.savings += savingsStatus(a, today).principal
      interest += savingsMonthlyInterest(a, today)
    }
  }
  const invested = byKind.fund
  return {
    netWorth: invested + byKind.savings,
    invested,
    savings: byKind.savings,
    gain: invested - cost,
    gainRate: cost > 0 ? (invested - cost) / cost : null,
    monthlyInterest: interest,
    byKind,
  }
}
