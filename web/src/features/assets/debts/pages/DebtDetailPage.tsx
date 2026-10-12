import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Minus, Pencil, Plus } from 'lucide-react'
import DebtSummaryCard from '@/features/assets/debts/components/DebtSummaryCard'
import DebtEntryRow from '@/features/assets/debts/components/DebtEntryRow'
import DebtEntrySheet from '@/features/assets/debts/components/DebtEntrySheet'
import { debtType } from '@/features/assets/debts/debtOptions'
import { debtHistory, debtStatus, type DebtEntry } from '@/features/assets/debts/debtStats'
import type { DebtDetails } from '@/features/assets/debts/types'
import { useCategories } from '@/features/categories/useCategories'
import { useAssets } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, formatCurrency, formatDate, todayISO } from '@/shared/utils/format'

const LIST = '/budget/savings'
const rateFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

type Sheet = { kind: 'entry'; entryKind: DebtEntry['kind']; entry?: DebtEntry } | { kind: 'delete' } | null

/** One debt: what's left, the terms, and the repayment history. */
export default function DebtDetailPage() {
  const { assets, update, remove } = useAssets()
  const { categories } = useCategories()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [sheet, setSheet] = useState<Sheet>(null)

  const found = assets.find((a) => a.id === id)
  const debt = found?.kind === 'debt' ? found : undefined
  if (!debt) return <Navigate to={LIST} replace />

  const d = debt.details
  const s = debtStatus(d, todayISO())
  const history = debtHistory(d)
  const saveDetails = async (details: DebtDetails) => {
    await update(debt.id, { kind: 'debt', name: debt.name, details })
    setSheet(null)
  }

  const purpose = categories.find((c) => c.id === d.categoryId)?.name
  const terms: [string, string][] = [
    ['Bên cho vay', d.lender],
    ['Loại', debtType(d.type).label],
    ['Vay ban đầu', formatCurrency(d.amount)],
  ]
  if (purpose) terms.push(['Mục đích', purpose])
  terms.push(['Ngày vay', formatDate(d.startDate)])
  if (d.dueDate) terms.push(['Hạn trả', formatDate(d.dueDate)])
  if (d.rate > 0) terms.push(['Lãi suất', `${rateFormat.format(d.rate)}%/năm · ≈ ${formatCompactCurrency(s.monthlyInterest)}/tháng`])

  return (
    <>
      <PageHeader
        title={debt.name || d.lender}
        subtitle="Khoản nợ"
        back
        fallback={LIST}
        action={
          <button
            type="button"
            onClick={() => navigate(`${LIST}/debts/${debt.id}/edit`)}
            aria-label="Sửa thông tin khoản nợ"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-gray-700 shadow-sm active:bg-gray-100"
          >
            <Pencil className="size-5" />
          </button>
        }
      />

      <main className="flex flex-col gap-5 px-5 pt-2 pb-4">
        <DebtSummaryCard status={s} />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 text-red-600" onClick={() => setSheet({ kind: 'entry', entryKind: 'borrow' })}>
            <Plus className="size-5" /> Vay thêm
          </Button>
          <Button className="h-12" disabled={s.remaining === 0} onClick={() => setSheet({ kind: 'entry', entryKind: 'repay' })}>
            <Minus className="size-5" /> Trả nợ
          </Button>
        </div>

        <Card className="p-0">
          <dl className="divide-y divide-gray-100 px-4">
            {terms.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-3">
                <dt>
                  <Text as="span" variant="caption" tone="muted">
                    {label}
                  </Text>
                </dt>
                <dd className="min-w-0 text-right">
                  <Text as="span" variant="caption" weight="semibold">
                    {value}
                  </Text>
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <section className="flex flex-col gap-3">
          <Text as="h2" variant="label" tone="muted" className="px-1 tracking-wide uppercase">
            Lịch sử vay và trả
          </Text>
          {history.length === 0 ? (
            <Text tone="muted" className="py-4 text-center">
              Chưa có lần vay thêm hay trả nợ nào.
            </Text>
          ) : (
            <Card className="divide-y divide-gray-100 p-0">
              {history.map((e) => (
                <DebtEntryRow key={`${e.kind}-${e.id}`} entry={e} onSelect={() => setSheet({ kind: 'entry', entryKind: e.kind, entry: e })} />
              ))}
            </Card>
          )}
        </section>

        <button type="button" onClick={() => setSheet({ kind: 'delete' })} className="py-2 text-sm font-semibold text-red-600">
          Xóa khoản nợ này
        </button>
      </main>

      {sheet?.kind === 'entry' && (
        <DebtEntrySheet details={d} kind={sheet.entryKind} entry={sheet.entry} onClose={() => setSheet(null)} onSave={saveDetails} />
      )}
      {sheet?.kind === 'delete' && (
        <ConfirmDialog
          title="Xóa khoản nợ?"
          message="Khoản nợ và lịch sử trả nợ sẽ bị xóa. Bạn không thể hoàn tác."
          confirmLabel="Xóa"
          onConfirm={async () => {
            await remove(debt.id)
            if (location.key === 'default') navigate(LIST, { replace: true })
            else navigate(-1)
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  )
}
