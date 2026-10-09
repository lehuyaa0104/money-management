import type { Asset, AssetKind } from './useAssets'

export const isInvestment = (a: Asset) => a.kind !== 'savings'

/** What an investment is worth now, or a savings balance. */
export const assetValue = (a: Asset) => (isInvestment(a) ? Math.round(a.quantity * a.price) : a.balance)

export const investmentCost = (a: Asset) => Math.round(a.quantity * a.costPrice)

/** Simple interest, as banks quote term deposits. */
export const yearlyInterest = (a: Asset) => Math.round((a.balance * a.rate) / 100)
export const monthlyInterest = (a: Asset) => Math.round((a.balance * a.rate) / 100 / 12)

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

export function summarize(assets: Asset[]): PortfolioSummary {
  const byKind: Record<AssetKind, number> = { stock: 0, etf: 0, crypto: 0, savings: 0 }
  let cost = 0
  let interest = 0
  for (const a of assets) {
    byKind[a.kind] += assetValue(a)
    if (isInvestment(a)) cost += investmentCost(a)
    else interest += monthlyInterest(a)
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
