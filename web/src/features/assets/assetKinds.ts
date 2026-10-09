import { BarChart3, Bitcoin, Landmark, PieChart, type LucideIcon } from 'lucide-react'
import type { AssetKind } from './useAssets'

/** How each kind of asset is labelled and coloured across the assets screens. */
export const ASSET_KINDS: Record<AssetKind, { label: string; badge: string; color: string; tile: string; icon: LucideIcon }> = {
  stock: { label: 'Cổ phiếu', badge: 'STOCK', color: '#3b82f6', tile: 'bg-blue-50 text-blue-600', icon: BarChart3 },
  etf: { label: 'ETF', badge: 'ETF', color: '#8b5cf6', tile: 'bg-violet-50 text-violet-600', icon: PieChart },
  crypto: { label: 'Crypto', badge: 'CRYPTO', color: '#f97316', tile: 'bg-orange-50 text-orange-600', icon: Bitcoin },
  savings: { label: 'Tiết kiệm', badge: '', color: '#16a34a', tile: 'bg-primary-soft text-primary', icon: Landmark },
}

export const signedPercent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 2, signDisplay: 'always' })
