import { useState } from 'react'
import { Plus } from 'lucide-react'
import AllocationBar from '@/features/assets/components/AllocationBar'
import AssetFormSheet from '@/features/assets/components/AssetFormSheet'
import AssetsEmptyState from '@/features/assets/components/AssetsEmptyState'
import AssetsSummaryCard from '@/features/assets/components/AssetsSummaryCard'
import AssetTabs, { type AssetTab } from '@/features/assets/components/AssetTabs'
import HoldingRow from '@/features/assets/components/HoldingRow'
import SavingsCard from '@/features/assets/components/SavingsCard'
import SectionTitle from '@/features/assets/components/SectionTitle'
import { assetValue, isInvestment, monthlyInterest, summarize } from '@/features/assets/assetStats'
import { useAssets } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency } from '@/shared/utils/format'

type Sheet = { kind: 'create' } | { kind: 'edit'; id: string } | null

export default function AssetsPage() {
  const { assets, create, update, remove } = useAssets()
  const [tab, setTab] = useState<AssetTab>('all')
  const [sheet, setSheet] = useState<Sheet>(null)
  const editing = sheet?.kind === 'edit' ? assets.find((a) => a.id === sheet.id) : undefined

  const summary = summarize(assets)
  const shown = assets.filter((a) => tab === 'all' || a.kind === tab)
  const holdings = shown.filter(isInvestment)
  const savings = shown.filter((a) => !isInvestment(a))

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
            onClick={() => setSheet({ kind: 'create' })}
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
          <AssetsEmptyState onAdd={() => setSheet({ kind: 'create' })} />
        ) : (
          <>
            <AllocationBar byKind={summary.byKind} />

            <AssetTabs value={tab} onChange={setTab} />

            {holdings.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle title="Danh mục đầu tư" extra={formatCompactCurrency(holdings.reduce((s, a) => s + assetValue(a), 0))} />
                <Card className="divide-y divide-gray-100 p-0">
                  {holdings.map((a) => (
                    <HoldingRow key={a.id} asset={a} onSelect={() => setSheet({ kind: 'edit', id: a.id })} />
                  ))}
                </Card>
              </section>
            )}

            {savings.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle title="Tài khoản tiết kiệm" extra={`+${formatCompactCurrency(savings.reduce((s, a) => s + monthlyInterest(a), 0))}/tháng`} />
                {savings.map((a) => (
                  <SavingsCard key={a.id} asset={a} onSelect={() => setSheet({ kind: 'edit', id: a.id })} />
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

      {sheet?.kind === 'create' && (
        <AssetFormSheet
          onClose={() => setSheet(null)}
          onSave={async (input) => {
            await create(input)
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'edit' && editing && (
        <AssetFormSheet
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
