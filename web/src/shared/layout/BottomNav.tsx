import { NavLink } from 'react-router'
import { ChartColumn, CreditCard, House, Target, User, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Trang chủ', icon: House },
  { to: '/transactions', label: 'Giao dịch', icon: CreditCard },
  { to: '/analytics', label: 'Phân tích', icon: ChartColumn },
  { to: '/budget', label: 'Ngân sách', icon: Target },
  { to: '/profile', label: 'Cá nhân', icon: User },
]

export default function BottomNav() {
  return (
    <nav className="pb-safe-nav fixed inset-x-0 bottom-0 z-10 mx-auto max-w-120 border-t border-gray-100 bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-5 pt-2">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 text-xs font-semibold',
                  isActive ? 'text-primary' : 'text-gray-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-9 w-14 place-items-center rounded-full transition',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
