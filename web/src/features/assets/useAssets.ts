import { useContext } from 'react'
import { AssetsContext } from './AssetsContext'
import type { DebtDetails } from './debts/types'
import type { FundDetails } from './funds/types'
import type { SavingsDetails } from './savings/types'

export type AssetKind = 'fund' | 'savings' | 'debt'

/** Common fields plus `details` that depend on `kind`, stored by the API as a JSON column. */
export type AssetInput = { name: string } & (
  | { kind: 'fund'; details: FundDetails }
  | { kind: 'savings'; details: SavingsDetails }
  | { kind: 'debt'; details: DebtDetails }
)
export type Asset = AssetInput & { id: string }
export type SavingsAsset = Extract<Asset, { kind: 'savings' }>
export type FundAsset = Extract<Asset, { kind: 'fund' }>
export type DebtAsset = Extract<Asset, { kind: 'debt' }>

/** The signed-in user's assets, loaded by <AssetsProvider> (a layout route around the assets screens). */
export function useAssets() {
  const ctx = useContext(AssetsContext)
  if (!ctx) throw new Error('useAssets must be used inside <AssetsProvider>')
  return ctx
}
