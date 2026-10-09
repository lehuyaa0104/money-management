import { fundPosition } from './funds/fundStats'
import { savingsMonthlyInterest, savingsStatus } from './savings/savingsStats'
import type { Asset, AssetKind, FundAsset, InvestmentAsset, SavingsAsset } from './useAssets'

/** Stocks (ETFs included) and crypto, entered as a quantity and an average price. */
export const isInvestment = (a: Asset): a is InvestmentAsset => a.kind === 'stock' || a.kind === 'crypto'
export const isFund = (a: Asset): a is FundAsset => a.kind === 'fund'
export const isSavings = (a: Asset): a is SavingsAsset => a.kind === 'savings'

export const investmentValue = (a: InvestmentAsset) => Math.round(a.details.quantity * a.details.price)
export const investmentCost = (a: InvestmentAsset) => Math.round(a.details.quantity * a.details.costPrice)

export interface PortfolioSummary {
  netWorth: number
  invested: number
  savings: number
  /** Investments' (funds included) value minus what was paid for what's still held. */
  gain: number
  /** gain / cost; null with no investments. */
  gainRate: number | null
  monthlyInterest: number
  byKind: Record<AssetKind, number>
}

export function summarize(assets: Asset[], today: string): PortfolioSummary {
  const byKind: Record<AssetKind, number> = { stock: 0, crypto: 0, fund: 0, savings: 0 }
  let cost = 0
  let interest = 0
  for (const a of assets) {
    if (isInvestment(a)) {
      byKind[a.kind] += investmentValue(a)
      cost += investmentCost(a)
    } else if (isFund(a)) {
      const p = fundPosition(a.details)
      byKind.fund += p.value
      cost += p.cost
    } else {
      byKind.savings += savingsStatus(a, today).principal
      interest += savingsMonthlyInterest(a, today)
    }
  }
  const invested = byKind.stock + byKind.crypto + byKind.fund
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
