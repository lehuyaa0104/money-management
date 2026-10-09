import { savingsMonthlyInterest, savingsStatus } from './savings/savingsStats'
import type { Asset, AssetKind, InvestmentAsset, SavingsAsset } from './useAssets'

export const isInvestment = (a: Asset): a is InvestmentAsset => a.kind !== 'savings'
export const isSavings = (a: Asset): a is SavingsAsset => a.kind === 'savings'

export const investmentValue = (a: InvestmentAsset) => Math.round(a.details.quantity * a.details.price)
export const investmentCost = (a: InvestmentAsset) => Math.round(a.details.quantity * a.details.costPrice)

export interface PortfolioSummary {
  netWorth: number
  invested: number
  savings: number
  /** Investments' value minus what was paid for them. */
  gain: number
  /** gain / cost; null with no investments. */
  gainRate: number | null
  monthlyInterest: number
  byKind: Record<AssetKind, number>
}

export function summarize(assets: Asset[], today: string): PortfolioSummary {
  const byKind: Record<AssetKind, number> = { stock: 0, etf: 0, crypto: 0, savings: 0 }
  let cost = 0
  let interest = 0
  for (const a of assets) {
    if (isInvestment(a)) {
      byKind[a.kind] += investmentValue(a)
      cost += investmentCost(a)
    } else {
      byKind.savings += savingsStatus(a, today).principal
      interest += savingsMonthlyInterest(a, today)
    }
  }
  const invested = byKind.stock + byKind.etf + byKind.crypto
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
