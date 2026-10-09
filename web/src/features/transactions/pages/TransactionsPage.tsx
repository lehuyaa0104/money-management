import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarDays, Funnel, Plus, Search, X } from 'lucide-react'
import PageHeader from '@/shared/layout/PageHeader'
import TransactionRow from '@/features/transactions/components/TransactionRow'
import FilterSheet from '@/features/transactions/components/FilterSheet'
import TransactionDetailSheet from '@/features/transactions/components/TransactionDetailSheet'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import IconButton from '@/shared/ui/IconButton'
import Text from '@/shared/ui/Text'
import {
  EMPTY_FILTERS,
  applyFilters,
  hasActiveFilters,
  type TransactionFilters,
} from '@/features/transactions/filters'
import { useCategories } from '@/features/categories/useCategories'
import { useTransactions } from '@/features/transactions/useTransactions'
import type { Transaction, TransactionType } from '@/features/transactions/types'
import { formatCurrency, formatDayLabel } from '@/shared/utils/format'
import { groupByDay, sumBy } from '@/features/transactions/stats'


export default function TransactionsPage() {
  const { transactions, deleteTransaction } = useTransactions()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS)
  const navigate = useNavigate()
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const { categories: userCategories } = useCategories()

  const groups = groupByDay(applyFilters(transactions, filters, query))
  const filtering = hasActiveFilters(filters) || query.trim() !== ''

  // One removable chip per active filter.
  const chips: { key: string; label: string; clear: () => void }[] = []
  if (filters.type !== 'all') {
    chips.push({
      key: 'type',
      label: filters.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      clear: () => setFilters({ ...filters, type: 'all' }),
    })
  }
  // Names used by both an expense and an income category need "(chi)"/"(thu)" to tell them apart.
  const namesOf = (t: TransactionType) => new Set(userCategories.filter((c) => c.type === t).map((c) => c.name.toLowerCase()))
  const expenseNames = namesOf('expense')
  const inBothTypes = [...namesOf('income')].filter((n) => expenseNames.has(n))
  for (const key of filters.categories) {
    const split = key.indexOf(':') // keys are `${type}:${name}`; the name itself may contain ':'
    const type = key.slice(0, split)
    const name = key.slice(split + 1)
    const ambiguous = filters.type === 'all' && inBothTypes.includes(name.toLowerCase())
    chips.push({
      key,
      label: ambiguous ? `${name} (${type === 'income' ? 'thu' : 'chi'})` : name,
      clear: () => setFilters({ ...filters, categories: filters.categories.filter((k) => k !== key) }),
    })
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    setSelected(null)
  }

  return (
    <>
      <PageHeader
        title="Giao dịch"
        action={
          <div className="flex gap-2">
            <IconButton
              icon={CalendarDays}
              label="Xem lịch chi tiêu"
              onClick={() => navigate('/transactions/calendar')}
            />
            <IconButton
              icon={Funnel}
              label="Bộ lọc"
              badge={hasActiveFilters(filters)}
              onClick={() => setFilterOpen(true)}
            />
          </div>
        }
      />

      <main className="flex flex-col gap-5 px-5 pt-2 pb-20">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm giao dịch…"
            aria-label="Tìm giao dịch"
            enterKeyHint="search"
            className="h-14 w-full appearance-none rounded-2xl border border-gray-100 bg-white pr-12 pl-12 text-base shadow-sm outline-none placeholder:text-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xóa tìm kiếm"
              className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-gray-400 active:bg-gray-100"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {chips.length > 0 && (
          <div className="-mt-1 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                aria-label={`Bỏ lọc ${c.label}`}
                className="flex items-center gap-1 rounded-full bg-primary-soft py-1.5 pr-2 pl-3 text-sm font-semibold text-primary-dark"
              >
                {c.label}
                <X className="size-4" />
              </button>
            ))}
          </div>
        )}

        {groups.map((group) => {
          const net = sumBy(group.transactions, 'income') - sumBy(group.transactions, 'expense')
          return (
            <section key={group.date} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <Text as="h2" variant="label" tone="muted">
                  {formatDayLabel(group.date, true)}
                </Text>
                <Text
                  as="span"
                  variant="caption"
                  weight="bold"
                  tone={net > 0 ? 'primary' : net < 0 ? 'danger' : 'muted'}
                >
                  {net > 0 ? '+' : net < 0 ? '−' : ''}
                  {formatCurrency(Math.abs(net))}
                </Text>
              </div>
              <Card className="px-3 py-1">
                <ul className="divide-y divide-gray-100">
                  {group.transactions.map((t) => (
                    <li key={t.id}>
                      <TransactionRow transaction={t} onSelect={setSelected} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )
        })}

        {groups.length === 0 && (
          <Card className="flex flex-col items-center gap-4 py-10 text-center">
            <Text tone="muted">{filtering ? 'Không tìm thấy giao dịch phù hợp.' : 'Chưa có giao dịch nào.'}</Text>
            {filtering && (
              <Button
                variant="outline"
                className="h-11 w-auto px-5"
                onClick={() => {
                  setQuery('')
                  setFilters(EMPTY_FILTERS)
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </Card>
        )}
      </main>

      {/* Floating add button, kept inside the phone-width column on wide screens. */}
      <div className="bottom-fab pointer-events-none fixed inset-x-0 z-10 mx-auto max-w-120">
        <Link
          to="/transactions/new"
          aria-label="Thêm giao dịch"
          className="pointer-events-auto absolute right-5 bottom-0 grid size-16 place-items-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 active:bg-primary-dark"
        >
          <Plus className="size-7" />
        </Link>
      </div>

      {filterOpen && (
        <FilterSheet
          value={filters}
          onClose={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilters(next)
            setFilterOpen(false)
          }}
        />
      )}
      {selected && (
        <TransactionDetailSheet transaction={selected} onDelete={handleDelete} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
