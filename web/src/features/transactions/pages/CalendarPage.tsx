import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '@/shared/layout/PageHeader'
import TransactionRow from '@/features/transactions/components/TransactionRow'
import TransactionDetailSheet from '@/features/transactions/components/TransactionDetailSheet'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { useTransactions } from '@/features/transactions/useTransactions'
import type { Transaction } from '@/features/transactions/types'
import { cn } from '@/shared/utils/cn'
import {
  addMonths,
  formatCompactCurrency,
  formatCurrency,
  formatFullDate,
  formatMonthLabel,
  todayISO,
} from '@/shared/utils/format'
import { groupByDay, inMonth, monthKey, sumBy, totalsByDay } from '@/features/transactions/stats'

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// Ordinal green ramp, validated with the dataviz skill (monotone lightness, visible
// steps, light end ≥ 2:1 on the page surface). Text color keeps ≥ 4.5:1 on each step.
const LEVELS = [
  { bg: '#63c776', text: 'text-gray-900' },
  { bg: '#3faf59', text: 'text-gray-900' },
  { bg: '#1d9641', text: 'text-gray-900' },
  { bg: '#137b33', text: 'text-white' },
  { bg: '#096125', text: 'text-white' },
]

/**
 * Spending level 1–5 by rank within the month (quantiles), so one large bill
 * such as rent doesn't flatten every other day into the lowest shade.
 */
function levelFor(amount: number, sortedAmounts: number[]): number {
  if (amount <= 0) return 0
  const rank = sortedAmounts.filter((a) => a <= amount).length
  return Math.ceil((rank / sortedAmounts.length) * LEVELS.length)
}

function daysInMonth(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const count = new Date(year, monthNumber, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

export default function CalendarPage() {
  const { transactions, deleteTransaction } = useTransactions()
  const [params, setParams] = useSearchParams()
  const [detail, setDetail] = useState<Transaction | null>(null)

  const today = todayISO()
  const currentMonth = monthKey(today)
  // Month and day live in the URL so a refresh or "back" keeps the view.
  const month = params.get('month') ?? currentMonth
  const selectedDay = params.get('day') ?? (month === currentMonth ? today : null)

  const monthTransactions = inMonth(transactions, month)
  const totals = totalsByDay(monthTransactions)
  const sortedAmounts = [...totals.values()]
    .map((d) => d.expense)
    .filter((a) => a > 0)
    .sort((a, b) => a - b)

  const days = daysInMonth(month)
  // Monday-first grid: blank cells before the 1st.
  const leadingBlanks = (new Date(`${month}-01T00:00:00`).getDay() + 6) % 7

  const goToMonth = (next: string) => setParams({ month: next }, { replace: true })
  const selectDay = (day: string) => setParams({ month, day }, { replace: true })

  const dayTransactions = selectedDay ? (groupByDay(monthTransactions).find((g) => g.date === selectedDay)?.transactions ?? []) : []
  const dayNet = sumBy(dayTransactions, 'income') - sumBy(dayTransactions, 'expense')

  return (
    <>
      <PageHeader title="Lịch chi tiêu" back centered fallback="/transactions" />

      <main className="flex flex-col gap-5 px-5 pt-1 pb-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToMonth(addMonths(month, -1))}
            aria-label="Tháng trước"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <Text as="h2" variant="heading">
              {formatMonthLabel(month)}
            </Text>
            <Text variant="caption" tone="muted">
              Tổng chi {formatCurrency(sumBy(monthTransactions, 'expense'))}
            </Text>
          </div>
          <button
            type="button"
            onClick={() => goToMonth(addMonths(month, 1))}
            disabled={month >= currentMonth}
            aria-label="Tháng sau"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div>
          <div aria-hidden="true" className="mb-2 grid grid-cols-7 gap-1.5">
            {WEEKDAY_HEADERS.map((d) => (
              <Text key={d} as="span" variant="label" tone="muted" className="text-center">
                {d}
              </Text>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden="true" />
            ))}
            {days.map((day) => {
              const dayTotals = totals.get(day)
              const expense = dayTotals?.expense ?? 0
              const level = levelFor(expense, sortedAmounts)
              const style = level > 0 ? LEVELS[level - 1] : null
              const future = day > today
              const selected = day === selectedDay

              return (
                <button
                  key={day}
                  type="button"
                  disabled={future}
                  onClick={() => selectDay(day)}
                  aria-pressed={selected}
                  aria-label={`${formatFullDate(day)}${expense > 0 ? `, chi ${formatCurrency(expense)}` : ''}${
                    dayTotals ? `, ${dayTotals.count} giao dịch` : ', không có giao dịch'
                  }`}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-xl transition',
                    style ? style.text : future ? 'text-gray-300' : 'text-gray-400',
                    selected && 'ring-2 ring-gray-900 ring-offset-2 ring-offset-gray-50',
                  )}
                  style={style ? { backgroundColor: style.bg } : undefined}
                >
                  <span className="text-base leading-tight font-bold">{Number(day.slice(8))}</span>
                  {expense > 0 && (
                    <span className="max-w-full truncate px-0.5 text-[10px] leading-tight font-semibold">
                      {formatCompactCurrency(expense)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div aria-hidden="true" className="mt-4 flex items-center gap-2">
            <Text as="span" variant="caption" tone="muted">
              Thấp
            </Text>
            {LEVELS.map((l) => (
              <span key={l.bg} className="h-3 w-7 rounded-full" style={{ backgroundColor: l.bg }} />
            ))}
            <Text as="span" variant="caption" tone="muted">
              Cao
            </Text>
          </div>
        </div>

        {selectedDay ? (
          <>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Text as="h2" variant="subheading" className="truncate">
                  {formatFullDate(selectedDay)}
                </Text>
                <Text variant="caption" tone="muted">
                  {dayTransactions.length} giao dịch
                </Text>
              </div>
              <Text
                as="span"
                variant="heading"
                tone={dayNet > 0 ? 'primary' : dayNet < 0 ? 'danger' : 'muted'}
                className="whitespace-nowrap"
              >
                {dayNet > 0 ? '+' : dayNet < 0 ? '−' : ''}
                {formatCurrency(Math.abs(dayNet))}
              </Text>
            </Card>

            {dayTransactions.length > 0 ? (
              <Card className="px-3 py-1">
                <ul className="divide-y divide-gray-100">
                  {dayTransactions.map((t) => (
                    <li key={t.id}>
                      <TransactionRow transaction={t} onSelect={setDetail} />
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Text tone="muted" className="text-center">
                Không có giao dịch trong ngày này.
              </Text>
            )}
          </>
        ) : (
          <Text tone="muted" className="text-center">
            Chọn một ngày để xem giao dịch.
          </Text>
        )}
      </main>

      {detail && (
        <TransactionDetailSheet
          transaction={detail}
          onClose={() => setDetail(null)}
          onDelete={async (id) => {
            await deleteTransaction(id)
            setDetail(null)
          }}
        />
      )}
    </>
  )
}
