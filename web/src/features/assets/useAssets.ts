import { useCallback, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import type { FundDetails } from './funds/types'
import type { SavingsDetails } from './savings/types'

export type AssetKind = 'fund' | 'savings'

/**
 * Common fields plus `details` that depend on `kind`, the shape the API will
 * store as a JSON column.
 */
export type AssetInput = { name: string } & (
  | { kind: 'fund'; details: FundDetails }
  | { kind: 'savings'; details: SavingsDetails }
)
export type Asset = AssetInput & { id: string }
export type SavingsAsset = Extract<Asset, { kind: 'savings' }>
export type FundAsset = Extract<Asset, { kind: 'fund' }>

function normalize(input: AssetInput): AssetInput {
  const name = input.name.trim()
  return input.kind === 'savings'
    ? { ...input, name, details: { ...input.details, bank: input.details.bank.trim() } }
    : { ...input, name, details: { ...input.details, code: input.details.code.trim().toUpperCase() } }
}

function read(key: string): Asset[] {
  try {
    const stored = localStorage.getItem(key)
    // Entries saved before `details` existed (only on this branch's test data) are skipped.
    // Only kinds this version knows; stocks and crypto entered earlier on this branch are left out.
    return stored ? (JSON.parse(stored) as Asset[]).filter((a) => a.details && (a.kind === 'fund' || a.kind === 'savings')) : []
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
  /** Resolves to the new asset's id. */
  const create = useCallback(
    async (input: AssetInput) => {
      const id = newId()
      save((list) => [{ id, ...normalize(input) } as Asset, ...list])
      return id
    },
    [save],
  )
  const update = useCallback(
    async (id: string, input: AssetInput) => save((list) => list.map((a) => (a.id === id ? { id, ...normalize(input) } : a))),
    [save],
  )
  const remove = useCallback(async (id: string) => save((list) => list.filter((a) => a.id !== id)), [save])

  return { assets, create, update, remove }
}
