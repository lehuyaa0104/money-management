import { useState } from 'react'
import { PiggyBank, Plus } from 'lucide-react'
import GoalCard from '@/features/goals/components/GoalCard'
import GoalDetailSheet from '@/features/goals/components/GoalDetailSheet'
import GoalFormSheet from '@/features/goals/components/GoalFormSheet'
import GoalsSummaryCard from '@/features/goals/components/GoalsSummaryCard'
import PageHeader from '@/shared/layout/PageHeader'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { useGoals } from '@/features/goals/useGoals'

type Sheet = { kind: 'create' } | { kind: 'detail'; id: string } | { kind: 'edit'; id: string } | null

export default function GoalsPage() {
  const { goals, status, error, retry, create, update, deposit, withdraw, remove } = useGoals()
  const [sheet, setSheet] = useState<Sheet>(null)
  const current = sheet && sheet.kind !== 'create' ? goals.find((g) => g.id === sheet.id) : undefined

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)

  return (
    <>
      <PageHeader
        title="Mục tiêu tiết kiệm"
        back
        centered
        fallback="/budget"
        action={
          <button
            type="button"
            onClick={() => setSheet({ kind: 'create' })}
            aria-label="Thêm mục tiêu"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary active:bg-green-200"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      <main className="flex flex-col gap-5 px-5 pt-2 pb-4">
        {status === 'error' ? (
          <Card className="flex flex-col items-center gap-4 py-8 text-center">
            <Text tone="danger">{error}</Text>
            <Button variant="outline" className="h-11 w-auto px-6" onClick={retry}>
              Thử lại
            </Button>
          </Card>
        ) : status === 'loading' && goals.length === 0 ? (
          <Card>
            <Text tone="muted" className="py-8 text-center">
              Đang tải mục tiêu…
            </Text>
          </Card>
        ) : goals.length > 0 ? (
          <>
            <GoalsSummaryCard saved={totalSaved} target={totalTarget} />
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onSelect={() => setSheet({ kind: 'detail', id: g.id })} />
            ))}
          </>
        ) : (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <PiggyBank className="size-7" />
            </span>
            <Text variant="subheading" as="p" className="mt-2">
              Chưa có mục tiêu nào
            </Text>
            <Text variant="caption" tone="muted" className="max-w-64">
              Đặt mục tiêu cho khoản bạn muốn dành dụm, như một chuyến đi hay một chiếc laptop mới.
            </Text>
            <Button className="mt-4 h-12 w-auto px-6" onClick={() => setSheet({ kind: 'create' })}>
              <Plus className="size-5" /> Tạo mục tiêu
            </Button>
          </Card>
        )}
      </main>

      {sheet?.kind === 'create' && (
        <GoalFormSheet
          onClose={() => setSheet(null)}
          onSave={async (input) => {
            await create(input)
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'edit' && current && (
        <GoalFormSheet
          goal={current}
          onClose={() => setSheet({ kind: 'detail', id: current.id })}
          onSave={async (input) => {
            await update(current.id, input)
            setSheet({ kind: 'detail', id: current.id })
          }}
        />
      )}
      {sheet?.kind === 'detail' && current && (
        <GoalDetailSheet
          goal={current}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ kind: 'edit', id: current.id })}
          onDeposit={(amount) => deposit(current.id, amount)}
          onWithdraw={(amount) => withdraw(current.id, amount)}
          onDelete={async () => {
            await remove(current.id)
            setSheet(null)
          }}
        />
      )}
    </>
  )
}
