import { createContext } from 'react'
import type { DatedNav } from './funds/fundStats'
import type { Asset, AssetInput } from './useAssets'

export interface AssetsContextValue {
  /** The signed-in user's savings deposits and funds from the API, newest first. */
  assets: Asset[]
  /** Funds' latest published NAVs by code; empty until loaded, or if the API couldn't get them. */
  navs: Record<string, DatedNav>
  /** Saves on the server and adds it to the list; resolves to its id. Throws ApiError. */
  create: (input: AssetInput) => Promise<string>
  /** Saves on the server and replaces it in the list. Throws ApiError. */
  update: (id: string, input: AssetInput) => Promise<void>
  /** Deletes on the server and drops it from the list. Throws ApiError. */
  remove: (id: string) => Promise<void>
}

export const AssetsContext = createContext<AssetsContextValue | null>(null)
