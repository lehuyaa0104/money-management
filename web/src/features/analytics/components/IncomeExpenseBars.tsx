import { EXPENSE_COLOR, INCOME_COLOR } from '@/shared/utils/chart'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { formatCycleLabel, shortCycleLabel, type MonthTotals } from '@/features/transactions/stats'
import Text from '@/shared/ui/Text'

const BARS = [
  { key: 'income', label: 'Thu', color: INCOME_COLOR },
  { key: 'expense', label: 'Chi', color: EXPENSE_COLOR },
] as const

/** Paired bars (income, expense) per month, each labelled with its value. */
export default function IncomeExpenseBars({ months }: { months: MonthTotals[] }) {
  const max = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1)

  return (
    <div className="flex flex-1 flex-col">
      <div aria-hidden="true" className="flex h-32 items-end justify-around border-b border-gray-200">
        {months.map((m) => (
          <div key={m.month} className="flex items-end gap-0.5">
            {BARS.map((b) => (
              <div key={b.key} className="flex w-8 flex-col items-center gap-1">
                <span className="text-[10px] leading-none font-semibold whitespace-nowrap text-gray-600">
                  {/* "24,4tr" without the space so it fits above a narrow bar */}
                  {m[b.key] > 0 ? formatCompactCurrency(m[b.key]).replace(' ', '') : ''}
                </span>
                <span
                  className="w-3.5 rounded-t"
                  style={{ height: `${Math.max((m[b.key] / max) * 96, m[b.key] > 0 ? 2 : 0)}px`, backgroundColor: b.color }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-around">
        {months.map((m) => (
          <Text key={m.month} as="span" variant="caption" tone="muted" className="text-xs">
            {shortCycleLabel(m)}
          </Text>
        ))}
      </div>
      <div className="mt-auto flex gap-3 pt-4">
        {BARS.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
            <Text as="span" variant="caption" tone="subtle">
              {b.label}
            </Text>
          </span>
        ))}
      </div>

      {/* A table ignores width:1px, so the visually-hidden wrapper is a div. */}
      <div className="sr-only">
        <table>
          <caption>Thu và chi theo tháng</caption>
          <thead>
            <tr>
              <th scope="col">Tháng</th>
              <th scope="col">Thu</th>
              <th scope="col">Chi</th>
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
