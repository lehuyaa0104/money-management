import { useCallback, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'

export type AssetKind = 'stock' | 'etf' | 'crypto' | 'savings'

/** An investment (stock, ETF, crypto) or a savings account. Amounts are VND. */
export interface Asset {
  id: string
  kind: AssetKind
  /** Company or account name. */
  name: string
  // Investments only (0 / '' for savings).
  symbol: string
  quantity: number
  /** Average price paid per unit. */
  costPrice: number
  /** Price per unit now, entered by the user. */
  price: number
  // Savings only (0 for investments).
  balance: number
  /** Percent per year, e.g. 5.25. */
  rate: number
}

export type AssetInput = Omit<Asset, 'id'>

/** Trims text and clears the other kind's fields (what the API will do too). */
function normalize(input: AssetInput): AssetInput {
  const name = input.name.trim()
  return input.kind === 'savings'
    ? { ...input, name, symbol: '', quantity: 0, costPrice: 0, price: 0 }
    : { ...input, name, symbol: input.symbol.trim().toUpperCase(), balance: 0, rate: 0 }
}

function read(key: string): Asset[] {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as Asset[]) : []
  } catch {
    return []
  }
}

// randomUUID needs a secure context; the dev server opened by LAN IP isn't one.
const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * The signed-in user's assets, newest first.
 * shortcut: kept in this browser's localStorage (lost on another device or after clearing site data); move to the API when it's ready.
 */
export function useAssets() {
  const key = `mm.assets.${useAuth().user?.id}`
  const [assets, setAssets] = useState<Asset[]>(() => read(key))

  const save = useCallback(
    (change: (list: Asset[]) => Asset[]) => {
      // Based on what's stored, so another open tab's changes aren't overwritten.
      const next = change(read(key))
      localStorage.setItem(key, JSON.stringify(next)) // throws if storage is full/blocked; the sheet shows it
      setAssets(next)
    },
    [key],
  )

  // Async like the other features' API calls, so the sheets can stay the same once this moves to the server.
  const create = useCallback(async (input: AssetInput) => save((list) => [{ id: newId(), ...normalize(input) }, ...list]), [save])
  const update = useCallback(
    async (id: string, input: AssetInput) => save((list) => list.map((a) => (a.id === id ? { id, ...normalize(input) } : a))),
    [save],
  )
  const remove = useCallback(async (id: string) => save((list) => list.filter((a) => a.id !== id)), [save])

  return { assets, create, update, remove }
}
