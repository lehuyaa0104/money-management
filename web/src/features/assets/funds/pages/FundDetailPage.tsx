import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Minus, Plus, RefreshCw } from 'lucide-react'
import FundSummaryCard from '@/features/assets/funds/components/FundSummaryCard'
import FundTransactionRow from '@/features/assets/funds/components/FundTransactionRow'
import FundTransactionSheet from '@/features/assets/funds/components/FundTransactionSheet'
import NavSheet from '@/features/assets/funds/components/NavSheet'
import { DRAGON_CAPITAL, DRAGON_CAPITAL_FUNDS } from '@/features/assets/funds/fundOptions'
import { byDate, fundPosition } from '@/features/assets/funds/fundStats'
import type { FundDetails, FundTransaction } from '@/features/assets/funds/types'
import { useAssets } from '@/features/assets/useAssets'
import PageHeader from '@/shared/layout/PageHeader'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import Text from '@/shared/ui/Text'

const LIST = '/budget/savings'

type Sheet = { kind: 'tx'; type: FundTransaction['type']; tx?: FundTransaction } | { kind: 'nav' } | { kind: 'delete' } | null

/**
 * One fund: position, trade history and the actions on it. At /funds/new/:code it
 * is a draft that is only saved with its first transaction, so backing out leaves nothing behind.
 */
export default function FundDetailPage() {
  const { assets, create, update, remove } = useAssets()
  const { id, code } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // A new fund opens straight on its first purchase.
  const [sheet, setSheet] = useState<Sheet>(code ? { kind: 'tx', type: 'buy' } : null)

  const found = id ? assets.find((a) => a.id === id) : undefined
  const saved = found?.kind === 'fund' ? found : undefined
  const fund = saved ?? (code ? draft(code, params.get('name') ?? '') : undefined)
  // A stale link (e.g. the fund was deleted on another tab).
  if (!fund) return <Navigate to={LIST} replace />

  const d = fund.details
  const position = fundPosition(d)
  const history = byDate(d.transactions).reverse()

  const saveDetails = async (details: FundDetails) => {
    const input = { kind: 'fund' as const, name: fund.name, details }
    if (saved) {
      await update(saved.id, input)
    } else {
      const newId = await create(input)
      navigate(`${LIST}/funds/${newId}`, { replace: true })
    }
    setSheet(null)
  }
  const saveTx = (tx: FundTransaction) => saveDetails({ ...d, transactions: [...d.transactions.filter((t) => t.id !== tx.id), tx] })

  return (
    <>
      <PageHeader title={d.code} subtitle={fund.name || d.manager || 'Chứng chỉ quỹ'} back fallback={LIST} />

      <main className="flex flex-col gap-5 px-5 pt-2 pb-4">
        {d.transactions.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <Text variant="subheading" as="p">
              Chưa có giao dịch
            </Text>
            <Text variant="caption" tone="muted" className="max-w-64">
              Thêm giao dịch mua đầu tiên theo xác nhận giao dịch của quỹ.
            </Text>
            <Button className="mt-4 h-12 w-auto px-6" onClick={() => setSheet({ kind: 'tx', type: 'buy' })}>
              <Plus className="size-5" /> Thêm giao dịch mua
            </Button>
          </Card>
        ) : (
          <>
            <FundSummaryCard position={position} />
            {position.oversold && <Alert>Có giao dịch bán nhiều hơn số CCQ đang có lúc đó. Hãy kiểm tra lại lịch sử giao dịch.</Alert>}

            <div className="grid grid-cols-3 gap-2">
              <Button className="h-12 text-sm" onClick={() => setSheet({ kind: 'tx', type: 'buy' })}>
                <Plus className="size-4" /> Mua thêm
              </Button>
              <Button variant="outline" className="h-12 text-sm text-red-600" disabled={position.units === 0} onClick={() => setSheet({ kind: 'tx', type: 'sell' })}>
                <Minus className="size-4" /> Bán
              </Button>
              <Button variant="outline" className="h-12 text-sm" onClick={() => setSheet({ kind: 'nav' })}>
                <RefreshCw className="size-4" /> NAV
              </Button>
            </div>

            <section className="flex flex-col gap-3">
              <Text as="h2" variant="label" tone="muted" className="px-1 tracking-wide uppercase">
                Lịch sử giao dịch
              </Text>
              <Card className="divide-y divide-gray-100 p-0">
                {history.map((tx) => (
                  <FundTransactionRow key={tx.id} tx={tx} onSelect={() => setSheet({ kind: 'tx', type: tx.type, tx })} />
                ))}
              </Card>
            </section>

            {saved && (
              <button type="button" onClick={() => setSheet({ kind: 'delete' })} className="py-2 text-sm font-semibold text-red-600">
                Xóa quỹ này
              </button>
            )}
          </>
        )}
      </main>

      {sheet?.kind === 'tx' && (
        <FundTransactionSheet
          details={d}
          tx={sheet.tx}
          type={sheet.type}
          onClose={() => setSheet(null)}
          onSave={saveTx}
          onRemove={sheet.tx && (() => saveDetails({ ...d, transactions: d.transactions.filter((t) => t.id !== sheet.tx?.id) }))}
        />
      )}
      {sheet?.kind === 'nav' && (
        <NavSheet code={d.code} nav={position.nav} onClose={() => setSheet(null)} onSave={(nav, navDate) => saveDetails({ ...d, nav, navDate })} />
      )}
      {sheet?.kind === 'delete' && saved && (
        <ConfirmDialog
          title={`Xóa ${d.code}?`}
          message="Quỹ và toàn bộ lịch sử giao dịch sẽ bị xóa. Bạn không thể hoàn tác."
          confirmLabel="Xóa"
          onConfirm={async () => {
            await remove(saved.id)
            if (location.key === 'default') navigate(LIST, { replace: true })
            else navigate(-1)
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  )
}

function draft(code: string, name: string) {
  const dc = DRAGON_CAPITAL_FUNDS.some((f) => f.code === code)
  return { name, details: { code, manager: dc ? DRAGON_CAPITAL : '', nav: 0, navDate: '', transactions: [] } as FundDetails }
}
