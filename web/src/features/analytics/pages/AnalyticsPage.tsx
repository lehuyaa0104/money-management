import IncomeExpenseBars from '@/features/analytics/components/IncomeExpenseBars'
import OverviewCard from '@/features/analytics/components/OverviewCard'
import StatTile from '@/features/analytics/components/StatTile'
import TopSpendingCard from '@/features/analytics/components/TopSpendingCard'
import TrendChart from '@/features/analytics/components/TrendChart'
import CategoryDonut from '@/features/transactions/components/CategoryDonut'
import { useCategories } from '@/features/categories/useCategories'
import PageHeader from '@/shared/layout/PageHeader'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { useTransactions } from '@/features/transactions/useTransactions'
import { useCycleStartDay } from '@/features/auth/useAuth'
import { addDays, addMonths, daysBetween, formatCompactCurrency, formatCurrency, todayISO } from '@/shared/utils/format'
import {
  cycleAt,
  cycleOf,
  expensesByCategory,
  formatCycleLabel,
  inCycle,
  largestExpense,
  monthlyTotals,
  sumBy,
  topSpending,
} from '@/features/transactions/stats'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 })
const pointsFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, signDisplay: 'always' })

function savingsRate(income: number, expense: number): number | null {
  return income > 0 ? (income - expense) / income : null
}

export default function AnalyticsPage() {
  const { transactions } = useTransactions()
  const { lookup } = useCategories()
  const startDay = useCycleStartDay()
  const today = todayISO()
  const cycle = cycleAt(today, startDay)
  const previousCycle = cycleOf(addMonths(cycle.month, -1), startDay)
  const daysElapsed = daysBetween(cycle.start, today) + 1

  const current = inCycle(transactions, cycle)
  const previous = inCycle(transactions, previousCycle)
  const income = sumBy(current, 'income')
  const expense = sumBy(current, 'expense')
  const previousIncome = sumBy(previous, 'income')
  const previousExpense = sumBy(previous, 'expense')

  // Cycle-to-date vs the same number of days of the last cycle, so day 8 isn't compared with a full cycle.
  const previousSamePeriod = sumBy(
    previous.filter((t) => t.date < addDays(previousCycle.start, daysElapsed)),
    'expense',
  )

  const dailyAverage = expense / daysElapsed
  const previousDailyAverage = previousExpense / daysBetween(previousCycle.start, previousCycle.end)
  const dailyDiff = dailyAverage - previousDailyAverage

  const rate = savingsRate(income, expense)
  const previousRate = savingsRate(previousIncome, previousExpense)
  const net = income - expense
  const biggest = largestExpense(current)

  const trend = monthlyTotals(
    transactions,
    [-5, -4, -3, -2, -1, 0].map((n) => cycleOf(addMonths(cycle.month, n), startDay)),
  )
  const slices = expensesByCategory(current, lookup)

  return (
    <>
      <PageHeader title="Phân tích" subtitle={`Tổng quan ${formatCycleLabel(cycle).toLowerCase()}`} />

      <main className="flex flex-col gap-4 px-5 pt-2 pb-4">
        <OverviewCard
          spent={expense}
          previousSamePeriod={previousSamePeriod}
          dailyAverage={dailyAverage}
          transactionCount={current.length}
        />

        <Card>
          <Text as="h2" variant="subheading">
            Xu hướng theo tháng
          </Text>
          <Text variant="caption" tone="muted">
            {formatCycleLabel(trend[0])} → {formatCycleLabel(cycle)}
          </Text>
          <div className="mt-2">
            <TrendChart months={trend} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="flex min-w-0 flex-col p-4">
            <Text as="h2" variant="subheading" className="mb-4 text-base">
              Theo danh mục
            </Text>
            {slices.length > 0 ? (
              <CategoryDonut slices={slices} compact />
            ) : (
              <Text variant="caption" tone="muted" className="my-auto text-center">
                Chưa có khoản chi.
              </Text>
            )}
          </Card>
          <Card className="flex min-w-0 flex-col p-4">
            <Text as="h2" variant="subheading" className="mb-4 text-base">
              Thu và chi
            </Text>
            <IncomeExpenseBars months={trend.slice(-2)} />
          </Card>
        </div>

        <TopSpendingCard items={topSpending(current)} />

        <div className="grid grid-cols-2 gap-4">
          <StatTile
            label="Trung bình mỗi ngày"
            value={formatCurrency(Math.round(dailyAverage))}
            note={
              previousExpense > 0
                ? `${dailyDiff <= 0 ? '−' : '+'}${formatCompactCurrency(Math.abs(dailyDiff))} so với tháng trước`
                : undefined
            }
            noteTone={dailyDiff <= 0 ? 'primary' : 'danger'}
          />
          <StatTile
            label="Khoản chi lớn nhất"
            value={biggest ? formatCurrency(biggest.amount) : '—'}
            note={biggest ? biggest.note || biggest.category : undefined}
          />
          <StatTile
            label="Tỷ lệ tiết kiệm"
            value={rate === null ? '—' : percentFormatter.format(rate)}
            note={
              rate !== null && previousRate !== null
                ? `${pointsFormatter.format((rate - previousRate) * 100)} điểm so với tháng trước`
                : rate === null
                  ? 'Chưa có thu nhập'
                  : undefined
            }
            noteTone={rate !== null && previousRate !== null ? (rate >= previousRate ? 'primary' : 'danger') : 'muted'}
          />
          <StatTile
            label="Dòng tiền ròng"
            value={`${net > 0 ? '+' : net < 0 ? '−' : ''}${formatCompactCurrency(Math.abs(net))}`}
            note="Thu − Chi"
          />
        </div>
      </main>
    </>
  )
}
