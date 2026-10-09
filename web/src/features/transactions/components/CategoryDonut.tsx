import { useState } from 'react'
import type { CategorySlice } from '@/features/transactions/stats'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import Text from '@/shared/ui/Text'

const RADIUS = 48
const STROKE = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // surface gap between segments, in viewBox units

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

interface CategoryDonutProps {
  slices: CategorySlice[]
  /** Smaller donut above a short legend (top 3), for half-width cards. */
  compact?: boolean
}

export default function CategoryDonut({ slices, compact = false }: CategoryDonutProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const total = slices.reduce((sum, s) => sum + s.amount, 0)
  const gap = slices.length > 1 ? GAP : 0
  const toggle = (name: string) => setSelected((current) => (current === name ? null : name))

  const lengths = slices.map((s) => (s.amount / total) * CIRCUMFERENCE)
  const segments = slices.map((slice, i) => ({
    ...slice,
    length: Math.max(lengths[i] - gap, 0.5),
    offset: lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
  }))

  const active = slices.find((s) => s.name === selected)

  return (
    <div className={cn('flex', compact ? 'flex-col items-center gap-4' : 'items-center gap-5')}>
      <div className={cn('relative shrink-0', compact ? 'size-28' : 'size-34')}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
              strokeDashoffset={-s.offset}
              onClick={() => toggle(s.name)}
              className={cn('cursor-pointer transition-opacity', selected && selected !== s.name && 'opacity-30')}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <Text as="span" variant={compact ? 'caption' : 'subheading'} weight="bold" className="leading-tight">
            {active ? percentFormatter.format(active.amount / total) : formatCompactCurrency(total)}
          </Text>
          <Text as="span" variant="caption" tone="muted" className="max-w-20 truncate text-xs">
            {active ? active.name : 'Tổng chi'}
          </Text>
        </div>
      </div>

      <ul className={cn('flex min-w-0 flex-col gap-1', compact ? 'w-full' : 'flex-1')}>
        {(compact ? slices.slice(0, 3) : slices).map((s) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => toggle(s.name)}
              aria-pressed={selected === s.name}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg py-1 text-left transition-opacity',
                selected && selected !== s.name && 'opacity-40',
              )}
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <Text as="span" variant="caption" tone="subtle" className="min-w-0 flex-1 truncate">
                {s.name}
              </Text>
              <Text as="span" variant="caption" weight="bold">
                {formatCompactCurrency(s.amount)}
              </Text>
            </button>
          </li>
        ))}
      </ul>

      {/* A table ignores width:1px, so the visually-hidden wrapper is a div. */}
      <div className="sr-only">
        <table>
          <caption>Chi tiêu theo danh mục</caption>
          <thead>
            <tr>
              <th scope="col">Danh mục</th>
              <th scope="col">Số tiền</th>
              <th scope="col">Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{formatCurrency(s.amount)}</td>
                <td>{percentFormatter.format(s.amount / total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
