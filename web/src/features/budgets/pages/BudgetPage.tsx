import { useState } from 'react'
import { Link } from 'react-router'
import { PiggyBank, Plus, Target } from 'lucide-react'
import BudgetCard from '@/features/budgets/components/BudgetCard'
import BudgetSheet from '@/features/budgets/components/BudgetSheet'
import BudgetSummaryCard from '@/features/budgets/components/BudgetSummaryCard'
import { useBudgets } from '@/features/budgets/useBudgets'
import { toCategoryMeta } from '@/features/categories/meta'
import { useCategories } from '@/features/categories/useCategories'
import { useCycleStartDay } from '@/features/auth/useAuth'
import { cycleAt, formatCycleLabel, inCycle } from '@/features/transactions/stats'
import { useTransactions } from '@/features/transactions/useTransactions'
import PageHeader from '@/shared/layout/PageHeader'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, todayISO } from '@/shared/utils/format'

function LoadState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return error ? (
    <Card className="flex flex-col items-center gap-4 py-8 text-center">
      <Text tone="danger">{error}</Text>
      <Button variant="outline" className="h-11 w-auto px-6" onClick={onRetry}>
        Thử lại
      </Button>
    </Card>
  ) : (
    <Card>
      <Text tone="muted" className="py-8 text-center">
        Đang tải ngân sách…
      </Text>
    </Card>
  )
}

export default function BudgetPage() {
  const startDay = useCycleStartDay()
  const cycle = cycleAt(todayISO(), startDay)
  const { transactions } = useTransactions()
  const categories = useCategories()
  const budgets = useBudgets(cycle.month, startDay)
  const [editing, setEditing] = useState<string | null>(null) // category id

  const expenseCategories = categories.categories.filter((c) => c.type === 'expense')
  const budgetFor = new Map(budgets.budgets.map((b) => [b.categoryId, b]))

  // Budgets come with "spent" from the server; for categories without one, show
  // this cycle's spending from the already-loaded transactions as a hint.
  const spentBy = new Map<string, number>()
  for (const t of inCycle(transactions, cycle)) {
    if (t.type === 'expense' && t.categoryId) spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount)
  }

  const budgeted = expenseCategories.filter((c) => budgetFor.has(c.id))
  const unbudgeted = expenseCategories.filter((c) => !budgetFor.has(c.id))
  const total = budgets.budgets.reduce((sum, b) => sum + b.limit, 0)
  // Only spending in budgeted categories counts against the total budget.
  const spent = budgets.budgets.reduce((sum, b) => sum + b.spent, 0)

  const editingCategory = expenseCategories.find((c) => c.id === editing)
  const editingBudget = editing ? budgetFor.get(editing) : undefined

  const loading = (s: string, count: number) => s === 'loading' && count === 0

  return (
    <>
      <PageHeader
        title="Ngân sách"
        subtitle={formatCycleLabel(cycle)}
        action={
          // Labels fit beside "Ngân sách" from ~393px; narrower phones get icons (labels stay for screen readers).
          <div className="flex shrink-0 gap-2">
            <Link
              to="/budget/savings"
              className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-600 active:bg-blue-100"
            >
              <PiggyBank className="size-5" />
              <span className="max-[392px]:sr-only">Tài sản</span>
            </Link>
            <Link
              to="/budget/goals"
              className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-2.5 text-sm font-bold text-primary active:bg-green-200"
            >
              <Target className="size-5" />
              <span className="max-[392px]:sr-only">Mục tiêu</span>
            </Link>
          </div>
        }
      />

      <main className="flex flex-col gap-4 px-5 pt-2 pb-4">
        {categories.status === 'error' ? (
          <LoadState error={categories.error} onRetry={categories.retry} />
        ) : budgets.status === 'error' ? (
          <LoadState error={budgets.error} onRetry={budgets.retry} />
        ) : loading(categories.status, categories.categories.length) || loading(budgets.status, budgets.budgets.length) ? (
          <LoadState error={null} onRetry={budgets.retry} />
        ) : expenseCategories.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <Text variant="subheading" as="p">
              Chưa có danh mục chi tiêu
            </Text>
            <Text variant="caption" tone="muted" className="max-w-64">
              Ngân sách được đặt theo từng danh mục chi tiêu. Hãy tạo danh mục trước.
            </Text>
            <Link to="/categories" className="mt-3 font-bold text-primary">
              Đi tới Danh mục
            </Link>
          </Card>
        ) : (
          <>
            {budgeted.length > 0 ? (
              <BudgetSummaryCard total={total} spent={spent} />
            ) : (
              <Card className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Target className="size-7" />
                </span>
                <Text variant="subheading" as="p" className="mt-2">
                  Chưa có ngân sách
                </Text>
                <Text variant="caption" tone="muted" className="max-w-64">
                  Đặt hạn mức chi tiêu mỗi tháng cho từng danh mục để biết khi nào sắp chi quá tay.
                </Text>
              </Card>
            )}

            {budgeted.map((c) => {
              const budget = budgetFor.get(c.id)!
              return (
                <BudgetCard
                  key={c.id}
                  category={toCategoryMeta(c)}
                  limit={budget.limit}
                  spent={budget.spent}
                  onEdit={() => setEditing(c.id)}
                />
              )
            })}

            {unbudgeted.length > 0 && (
              <section className="mt-2 flex flex-col gap-3">
                <Text as="h2" variant="label" tone="muted" className="px-1">
                  Chưa đặt ngân sách
                </Text>
                <Card className="px-3 py-1">
                  <ul className="divide-y divide-gray-100">
                    {unbudgeted.map((c) => {
                      const meta = toCategoryMeta(c)
                      const Icon = meta.icon
                      const spentHere = spentBy.get(c.id) ?? 0
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setEditing(c.id)}
                            className="flex w-full items-center gap-3 rounded-xl py-3 text-left active:bg-gray-50"
                          >
                            <span
                              aria-hidden="true"
                              className="grid size-10 shrink-0 place-items-center rounded-xl"
                              style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                            >
                              <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <Text as="span" weight="semibold" className="block truncate">
                                {c.name}
                              </Text>
                              {spentHere > 0 && (
                                <Text as="span" variant="caption" tone="muted" className="block">
                                  Đã chi {formatCompactCurrency(spentHere)}
                                </Text>
                              )}
                            </span>
                            <Text as="span" variant="caption" weight="bold" tone="primary" className="flex items-center gap-1">
                              <Plus className="size-4" /> Đặt hạn mức
                            </Text>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </section>
            )}
          </>
        )}
      </main>

      {editingCategory && (
        <BudgetSheet
          category={toCategoryMeta(editingCategory)}
          limit={editingBudget?.limit}
          spent={editingBudget?.spent ?? spentBy.get(editingCategory.id) ?? 0}
          onClose={() => setEditing(null)}
          onSave={async (limit) => {
            if (editingBudget) await budgets.update(editingBudget.id, limit)
            else await budgets.create(editingCategory.id, limit)
            setEditing(null)
          }}
          onRemove={async () => {
            if (editingBudget) await budgets.remove(editingBudget.id)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
