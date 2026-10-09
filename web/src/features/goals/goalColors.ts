import type { GoalColor } from './useGoals'

export interface GoalAccent {
  label: string
  /** Bars and rings. */
  base: string
  /** Text on white (≥ 4.5:1). */
  text: string
  /** Cover gradient when the goal has no photo. */
  cover: [string, string]
}

export const GOAL_ACCENTS: Record<GoalColor, GoalAccent> = {
  blue: { label: 'Xanh dương', base: '#2563eb', text: '#1d4ed8', cover: ['#3b82f6', '#1e3a8a'] },
  orange: { label: 'Cam', base: '#f97316', text: '#c2410c', cover: ['#fb923c', '#9a3412'] },
  violet: { label: 'Tím', base: '#7c3aed', text: '#6d28d9', cover: ['#8b5cf6', '#4c1d95'] },
  pink: { label: 'Hồng', base: '#db2777', text: '#be185d', cover: ['#ec4899', '#831843'] },
  teal: { label: 'Xanh ngọc', base: '#0d9488', text: '#0f766e', cover: ['#14b8a6', '#134e4a'] },
  green: { label: 'Xanh lá', base: '#16a34a', text: '#15803d', cover: ['#22c55e', '#14532d'] },
}

export const GOAL_COLORS = Object.keys(GOAL_ACCENTS) as GoalColor[]
