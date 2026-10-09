import type { Goal } from '@/features/goals/useGoals'
import { formatCurrency, formatMonthLabel } from '@/shared/utils/format'
import { GOAL_ACCENTS } from '@/features/goals/goalColors'
import Text from '@/shared/ui/Text'
import GoalCover from './GoalCover'
import ProgressRing from './ProgressRing'

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

export default function GoalCard({ goal, onSelect }: { goal: Goal; onSelect: () => void }) {
  const accent = GOAL_ACCENTS[goal.color]
  const progress = goal.saved / goal.target
  const remaining = goal.target - goal.saved
  const done = remaining <= 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full overflow-hidden rounded-4xl bg-white text-left shadow-sm transition active:scale-[0.99]"
    >
      <GoalCover goal={goal} className="h-44">
        <div className="absolute top-4 right-4">
          <ProgressRing progress={progress} color={accent.base} />
        </div>
        <div className="absolute inset-x-5 bottom-4 text-white">
          <Text as="h2" variant="heading" className="truncate text-2xl">
            {goal.name}
          </Text>
          {goal.deadline && (
            <Text variant="caption" className="text-white/80">
              Hạn {formatMonthLabel(goal.deadline).toLowerCase()}
            </Text>
          )}
        </div>
      </GoalCover>

      <div className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <Text variant="caption" tone="muted">
              Đã tiết kiệm
            </Text>
            <Text as="p" variant="heading" className="truncate text-2xl">
              {formatCurrency(goal.saved)}
            </Text>
          </div>
          <div className="min-w-0 text-right">
            <Text variant="caption" tone="muted">
              Mục tiêu
            </Text>
            <Text as="p" variant="heading" className="truncate text-2xl" style={{ color: accent.text }}>
              {formatCurrency(goal.target)}
            </Text>
          </div>
        </div>

        <div aria-hidden="true" className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 1) * 100}%`, backgroundColor: accent.base }} />
        </div>

        <div className="mt-2.5 flex justify-between gap-3">
          <Text variant="caption" tone="muted">
            {done ? 'Đã đạt mục tiêu 🎉' : `Còn ${formatCurrency(remaining)}`}
          </Text>
          <Text variant="caption" weight="bold" style={{ color: accent.text }}>
            Hoàn thành {percentFormatter.format(Math.min(progress, 1))}
          </Text>
        </div>
      </div>
    </button>
  )
}
