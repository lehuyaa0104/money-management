import { api } from '@/shared/api/apiClient'
import type { DatedNav } from './funds/fundStats'
import type { Asset, AssetInput } from './useAssets'

/** An asset as the API returns it; `details` has the same shape the web uses. */
type ApiAsset = Asset & { createdAt: string; updatedAt: string }

const toAsset = ({ id, kind, name, details }: ApiAsset) => ({ id, kind, name, details }) as Asset

const path = (id: string) => `/assets/${encodeURIComponent(id)}`

export async function listAssets(signal?: AbortSignal): Promise<Asset[]> {
  const { data } = await api.get<{ assets: ApiAsset[] }>('/assets', { signal })
  return data.assets.map(toAsset)
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const { data } = await api.post<{ asset: ApiAsset }>('/assets', input)
  return toAsset(data.asset)
}

/** Replaces kind, name and details. */
export async function updateAsset(id: string, input: AssetInput): Promise<Asset> {
  const { data } = await api.put<{ asset: ApiAsset }>(path(id), input)
  return toAsset(data.asset)
}

export async function deleteAsset(id: string): Promise<void> {
  await api.delete(path(id))
}

/** Latest published NAV of each fund the API tracks, by fund code. */
export async function listFundNavs(signal?: AbortSignal): Promise<Record<string, DatedNav>> {
  const { data } = await api.get<{ navs: { code: string; nav: number; navDate: string }[] }>('/funds/navs', { signal })
  return Object.fromEntries(data.navs.map((n) => [n.code, { nav: n.nav, date: n.navDate }]))
}
