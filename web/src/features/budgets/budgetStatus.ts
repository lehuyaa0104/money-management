/** Spending at or above this share of the limit counts as "near limit". */
export const NEAR_LIMIT = 0.8

export type BudgetStatus = 'ok' | 'near' | 'over'

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'over'
  if (spent >= limit * NEAR_LIMIT) return 'near'
  return 'ok'
}

// Status colors always come with a text badge, never color alone.
export const STATUS_STYLE: Record<BudgetStatus, { bar: string; tile: string; badge?: { label: string; className: string } }> = {
  ok: { bar: 'bg-primary', tile: 'bg-primary-soft text-primary' },
  near: {
    bar: 'bg-orange-500',
    tile: 'bg-orange-50 text-orange-500',
    badge: { label: 'Sắp hết', className: 'bg-orange-50 text-orange-600' },
  },
  over: {
    bar: 'bg-red-600',
    tile: 'bg-red-50 text-red-600',
    badge: { label: 'Vượt ngân sách', className: 'bg-red-600 text-white' },
  },
}
