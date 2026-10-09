import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { EXPENSE_COLOR, INCOME_COLOR, monotonePath, niceMax, type Point } from '@/shared/utils/chart'
import { cn } from '@/shared/utils/cn'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { formatCycleLabel, shortCycleLabel, type MonthTotals } from '@/features/transactions/stats'
import Text from '@/shared/ui/Text'

const WIDTH = 320
const HEIGHT = 120

const SERIES = [
  { key: 'income', label: 'Thu nhập', color: INCOME_COLOR },
  { key: 'expense', label: 'Chi tiêu', color: EXPENSE_COLOR },
] as const

export default function TrendChart({ months }: { months: MonthTotals[] }) {
  const [active, setActive] = useState<number | null>(null)
  const dataMax = Math.max(...months.flatMap((m) => [m.income, m.expense]))
  const max = niceMax(dataMax)
  const last = months.length - 1
  const xPercent = (i: number) => (i / last) * 100
  const y = (value: number) => HEIGHT - (value / max) * HEIGHT

  const pickFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    setActive(Math.round(ratio * last))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') setActive((i) => Math.min((i ?? -1) + 1, last))
    if (e.key === 'ArrowLeft') setActive((i) => Math.max((i ?? months.length) - 1, 0))
    if (e.key === 'Escape') setActive(null)
  }

  const activeMonth = active === null ? null : months[active]

  return (
    <div>
      <div className="flex justify-end gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
            <Text as="span" variant="caption" tone="subtle" className="text-xs">
              {s.label}
            </Text>
          </span>
        ))}
      </div>

      {/* Tooltip band above the plot so it never covers the lines. */}
      <div className="relative mt-1 h-12">
        {activeMonth && active !== null && (
          <div
            className={cn(
              'absolute top-0 rounded-xl bg-gray-900 px-2.5 py-1.5 whitespace-nowrap text-white',
              active === 0 ? 'translate-x-0' : active === last ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${xPercent(active)}%` }}
          >
            <Text as="span" variant="caption" weight="semibold" className="block text-xs">
              {formatCycleLabel(activeMonth)}
            </Text>
            <Text as="span" variant="caption" className="block text-xs">
              Thu {formatCompactCurrency(activeMonth.income)} · Chi {formatCompactCurrency(activeMonth.expense)}
            </Text>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div
          role="img"
          aria-label="Thu nhập và chi tiêu 6 tháng gần nhất. Dùng phím mũi tên để xem từng tháng."
          tabIndex={0}
          onPointerDown={pickFromPointer}
          onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && pickFromPointer(e)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="relative h-30 flex-1 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1="0"
                x2={WIDTH}
                y1={HEIGHT * f}
                y2={HEIGHT * f}
                stroke={f === 1 ? '#d1d5db' : '#f3f4f6'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {SERIES.map((s) => {
              const points: Point[] = months.map((m, i) => [(i / last) * WIDTH, y(m[s.key])])
              return (
                <path
                  key={s.key}
                  d={monotonePath(points)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>

          {active !== null && <span className="absolute inset-y-0 w-px bg-gray-300" style={{ left: `${xPercent(active)}%` }} />}
          {/* Dots: always on the latest month, plus the inspected one. */}
          {SERIES.flatMap((s) =>
            [...new Set([last, active ?? last])].map((i) => (
              <span
                key={`${s.key}-${i}`}
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{
                  backgroundColor: s.color,
                  left: `${xPercent(i)}%`,
                  top: `${(y(months[i][s.key]) / HEIGHT) * 100}%`,
                }}
              />
            )),
          )}
        </div>

        {/* Y-axis labels on the right, aligned to the gridlines. */}
        <div aria-hidden="true" className="relative w-9 shrink-0">
          {/* With no data yet only the 0 baseline is meaningful. */}
          {(dataMax > 0 ? [1, 0.5, 0] : [0]).map((f) => (
            <Text
              key={f}
              as="span"
              variant="caption"
              tone="muted"
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums"
              style={{ top: `${(1 - f) * 100}%` }}
            >
              {f === 0 ? '0' : formatCompactCurrency(max * f)}
            </Text>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="relative mt-3 mr-11 h-4">
        {months.map((m, i) => (
          <Text
            key={m.month}
            as="span"
            variant="caption"
            tone={active === i ? 'default' : 'muted'}
            weight={active === i ? 'semibold' : undefined}
            className={cn(
              'absolute top-0 text-xs',
              i === 0 ? 'translate-x-0' : i === last ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${xPercent(i)}%` }}
          >
            {shortCycleLabel(m)}
          </Text>
        ))}
      </div>

      {/* A table ignores width:1px, so the visually-hidden wrapper is a div. */}
      <div className="sr-only">
        <table>
          <caption>Thu nhập và chi tiêu theo tháng</caption>
          <thead>
            <tr>
              <th scope="col">Tháng</th>
              <th scope="col">Thu nhập</th>
              <th scope="col">Chi tiêu</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td>{formatCycleLabel(m)}</td>
                <td>{formatCurrency(m.income)}</td>
                <td>{formatCurrency(m.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
