import { Link } from 'react-router'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Target, type LucideIcon } from 'lucide-react'
import Text from '@/shared/ui/Text'

const ACTIONS: { to: string; label: string; icon: LucideIcon; tileClass: string }[] = [
  { to: '/transactions/new?type=expense', label: 'Chi tiêu', icon: ArrowUpRight, tileClass: 'bg-red-50 text-red-500' },
  { to: '/transactions/new?type=income', label: 'Thu nhập', icon: ArrowDownLeft, tileClass: 'bg-primary-soft text-primary' },
  { to: '/transfer', label: 'Chuyển tiền', icon: ArrowLeftRight, tileClass: 'bg-blue-50 text-blue-500' },
  { to: '/budget', label: 'Ngân sách', icon: Target, tileClass: 'bg-orange-50 text-orange-500' },
]

export default function QuickActions() {
  return (
    <nav aria-label="Thao tác nhanh" className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ to, label, icon: Icon, tileClass }) => (
        <Link key={to} to={to} className="flex flex-col items-center gap-2 active:opacity-70">
          <span className={`grid size-16 place-items-center rounded-2xl shadow-sm ${tileClass}`}>
            <Icon className="size-6" strokeWidth={2.2} />
          </span>
          <Text as="span" variant="caption" tone="subtle" weight="medium">
            {label}
          </Text>
        </Link>
      ))}
    </nav>
  )
}
