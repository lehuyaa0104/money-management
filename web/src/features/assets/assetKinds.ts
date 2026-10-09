import { Landmark, PieChart, type LucideIcon } from 'lucide-react'
import type { AssetKind } from './useAssets'

/** How each kind of asset is labelled and coloured across the assets screens. */
export const ASSET_KINDS: Record<AssetKind, { label: string; badge: string; color: string; tile: string; icon: LucideIcon }> = {
  fund: { label: 'Chứng chỉ quỹ', badge: 'CCQ', color: '#8b5cf6', tile: 'bg-violet-50 text-violet-600', icon: PieChart },
  savings: { label: 'Tiết kiệm', badge: '', color: '#16a34a', tile: 'bg-primary-soft text-primary', icon: Landmark },
}

export const signedPercent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 2, signDisplay: 'always' })
