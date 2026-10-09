import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { DailyPoint } from '@/features/transactions/stats'
import { cn } from '@/shared/utils/cn'
import { formatCurrency } from '@/shared/utils/format'
import { monotonePath, type Point } from '@/shared/utils/chart'
import Text from '@/shared/ui/Text'

const WIDTH = 320
const HEIGHT = 112
const TOP_PAD = 8

interface SpendingLineChartProps {
  days: DailyPoint[]
}

export default function SpendingLineChart({ days }: SpendingLineChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const gradientId = `spend-fill-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`

  const max = Math.max(...days.map((d) => d.amount), 1)
  const points: Point[] = days.map((d, i) => [
    (i / (days.length - 1)) * WIDTH,
    HEIGHT - (d.amount / max) * (HEIGHT - TOP_PAD),
  ])
  const line = monotonePath(points)
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`

  const pickFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    setActive(Math.round(ratio * (days.length - 1)))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') setActive((i) => Math.min((i ?? -1) + 1, days.length - 1))
    if (e.key === 'ArrowLeft') setActive((i) => Math.max((i ?? days.length) - 1, 0))
    if (e.key === 'Escape') setActive(null)
  }

  const activeDay = active === null ? null : days[active]
  const activeLeft = active === null ? 0 : (active / (days.length - 1)) * 100

  return (
    <div>
      {/* Tooltip band sits above the plot so it never covers the line. */}
      <div className="relative h-9">
        {activeDay && (
          <div
            className={cn(
              'absolute top-0 rounded-xl bg-gray-900 px-2.5 py-1 whitespace-nowrap text-white',
              active === 0 ? 'translate-x-0' : active === days.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${activeLeft}%` }}
          >
            <Text as="span" variant="caption" weight="semibold">
              {activeDay.weekday} {activeDay.label}: {formatCurrency(activeDay.amount)}
            </Text>
          </div>
        )}
      </div>

      <div
        role="img"
        aria-label="Biểu đồ chi tiêu 7 ngày gần nhất. Dùng phím mũi tên để xem từng ngày."
        tabIndex={0}
        onPointerDown={pickFromPointer}
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && pickFromPointer(e)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        className="relative h-28 touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={HEIGHT - 0.5}
            x2={WIDTH}
            y2={HEIGHT - 0.5}
            stroke="#e5e7eb"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {activeDay && active !== null && (
          <>
            <span className="absolute inset-y-0 w-px bg-gray-300" style={{ left: `${activeLeft}%` }} />
            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
              style={{ left: `${activeLeft}%`, top: `${(points[active][1] / HEIGHT) * 100}%` }}
            />
          </>
        )}
      </div>

      {/* Labels sit exactly under their points (0%, 1/6, … 100%), ends kept inside. */}
      <div className="relative mt-3 h-4">
        {days.map((d, i) => (
          <Text
            key={d.date}
            as="span"
            variant="caption"
            tone={active === i ? 'default' : 'muted'}
            weight={active === i ? 'semibold' : undefined}
            className={cn(
              'absolute top-0 text-xs',
              i === 0 ? 'translate-x-0' : i === days.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${(i / (days.length - 1)) * 100}%` }}
          >
            {d.weekday}
          </Text>
        ))}
      </div>

      {/* A table ignores width:1px, so the visually-hidden wrapper is a div. */}
      <div className="sr-only">
        <table>
          <caption>Chi tiêu theo ngày</caption>
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col">Chi tiêu</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>
                  {d.weekday} {d.label}
                </td>
                <td>{formatCurrency(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
