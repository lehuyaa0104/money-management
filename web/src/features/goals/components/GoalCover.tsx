import type { ReactNode } from 'react'
import { PiggyBank } from 'lucide-react'
import type { Goal } from '@/features/goals/useGoals'
import { cn } from '@/shared/utils/cn'
import { GOAL_ACCENTS } from '@/features/goals/goalColors'

/** Photo (or a gradient in the goal's color) with a dark fade so white text stays readable. */
export default function GoalCover({ goal, className, children }: { goal: Pick<Goal, 'image' | 'color'>; className?: string; children?: ReactNode }) {
  const [from, to] = GOAL_ACCENTS[goal.color].cover

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={goal.image ? undefined : { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {goal.image ? (
        <img src={goal.image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <PiggyBank aria-hidden="true" className="absolute -bottom-6 -left-4 size-40 text-white/15" strokeWidth={1.5} />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      {children}
    </div>
  )
}
