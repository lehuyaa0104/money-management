import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import AllocationBar from '@/features/assets/components/AllocationBar'
import AssetKindPicker from '@/features/assets/components/AssetKindPicker'
import AssetsEmptyState from '@/features/assets/components/AssetsEmptyState'
import AssetsSummaryCard from '@/features/assets/components/AssetsSummaryCard'
import AssetTabs, { type AssetTab } from '@/features/assets/components/AssetTabs'
import HoldingRow from '@/features/assets/components/HoldingRow'
import InvestmentFormSheet from '@/features/assets/components/InvestmentFormSheet'
import FundCard from '@/features/assets/funds/components/FundCard'
import FundPickerSheet from '@/features/assets/funds/components/FundPickerSheet'
import { fundPosition } from '@/features/assets/funds/fundStats'
import SavingsCard from '@/features/assets/savings/components/SavingsCard'
import SectionTitle from '@/features/assets/components/SectionTitle'
import { investmentValue, isFund, isInvestment, isSavings, summarize } from '@/features/assets/assetStats'
import { savingsMonthlyInterest } from '@/features/assets/savings/savingsStats'
import { useAssets, type InvestmentKind } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, todayISO } from '@/shared/utils/format'

type Sheet = { kind: 'pick' } | { kind: 'pickFund' } | { kind: 'create'; assetKind: InvestmentKind } | { kind: 'edit'; id: string } | null

const SAVINGS_FORM = '/budget/savings/accounts'
const FUNDS = '/budget/savings/funds'

export default function AssetsPage() {
  const { assets, create, update, remove } = useAssets()
  const [tab, setTab] = useState<AssetTab>('all')
  const [sheet, setSheet] = useState<Sheet>(null)
  const navigate = useNavigate()
  const today = todayISO()
  const found = sheet?.kind === 'edit' ? assets.find((a) => a.id === sheet.id) : undefined
  const editing = found && isInvestment(found) ? found : undefined

  const summary = summarize(assets, today)
  const shown = assets.filter((a) => tab === 'all' || a.kind === tab)
  const holdings = shown.filter(isInvestment)
  const funds = shown.filter(isFund)
  const savings = shown.filter(isSavings)

  return (
    <>
      <PageHeader
        title="Đầu tư & Tiết kiệm"
        subtitle="Danh mục tài sản"
        back
        fallback="/budget"
        action={
          <button
            type="button"
            onClick={() => setSheet({ kind: 'pick' })}
            aria-label="Thêm tài sản"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary active:bg-green-200"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      <main className="flex flex-col gap-5 px-5 pt-2 pb-4">
        <AssetsSummaryCard summary={summary} />

        {assets.length === 0 ? (
          <AssetsEmptyState onAdd={() => setSheet({ kind: 'pick' })} />
        ) : (
          <>
            <AllocationBar byKind={summary.byKind} />

            <AssetTabs value={tab} onChange={setTab} />

            {holdings.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle title="Danh mục đầu tư" extra={formatCompactCurrency(holdings.reduce((s, a) => s + investmentValue(a), 0))} />
                <Card className="divide-y divide-gray-100 p-0">
                  {holdings.map((a) => (
                    <HoldingRow key={a.id} asset={a} onSelect={() => setSheet({ kind: 'edit', id: a.id })} />
                  ))}
                </Card>
              </section>
            )}

            {funds.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle title="Chứng chỉ quỹ" extra={formatCompactCurrency(funds.reduce((s, a) => s + fundPosition(a.details).value, 0))} />
                <Card className="divide-y divide-gray-100 p-0">
                  {funds.map((a) => (
                    <FundCard key={a.id} asset={a} onSelect={() => navigate(`${FUNDS}/${a.id}`)} />
                  ))}
                </Card>
              </section>
            )}

            {savings.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle title="Tài khoản tiết kiệm" extra={`+${formatCompactCurrency(savings.reduce((s, a) => s + savingsMonthlyInterest(a, today), 0))}/tháng`} />
                {savings.map((a) => (
                  <SavingsCard key={a.id} asset={a} onSelect={() => navigate(`${SAVINGS_FORM}/${a.id}`)} />
                ))}
              </section>
            )}

            {shown.length === 0 && (
              <Text tone="muted" className="py-6 text-center">
                Chưa có tài sản loại này.
              </Text>
            )}
          </>
        )}
      </main>

      {sheet?.kind === 'pick' && (
        <AssetKindPicker
          onClose={() => setSheet(null)}
          onPick={(kind) => {
            if (kind === 'savings') navigate(`${SAVINGS_FORM}/new`)
            else if (kind === 'fund') setSheet({ kind: 'pickFund' })
            else setSheet({ kind: 'create', assetKind: kind })
          }}
        />
      )}
      {sheet?.kind === 'pickFund' && (
        <FundPickerSheet
          onClose={() => setSheet(null)}
          onPick={(code, name) => {
            const upper = code.trim().toUpperCase()
            // A fund already held opens as is: new purchases go into its history.
            const held = assets.find((a) => isFund(a) && a.details.code === upper)
            navigate(held ? `${FUNDS}/${held.id}` : `${FUNDS}/new/${encodeURIComponent(upper)}?name=${encodeURIComponent(name.trim())}`)
          }}
        />
      )}
      {sheet?.kind === 'create' && (
        <InvestmentFormSheet
          kind={sheet.assetKind}
          onClose={() => setSheet(null)}
          onSave={async (input) => {
            await create(input)
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'edit' && editing && (
        <InvestmentFormSheet
          asset={editing}
          onClose={() => setSheet(null)}
          onSave={async (input) => {
            await update(editing.id, input)
            setSheet(null)
          }}
          onRemove={async () => {
            await remove(editing.id)
            setSheet(null)
          }}
        />
      )}
    </>
  )
}
