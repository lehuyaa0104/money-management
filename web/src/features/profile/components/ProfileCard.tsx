import type { User } from '@/features/auth/types'
import Avatar from '@/shared/ui/Avatar'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'

interface ProfileCardProps {
  user: User
  balance: number
  transactionCount: number
  monthlyAverage: number
  streak: number
}

const countFormatter = new Intl.NumberFormat('vi-VN')

function memberSince(createdAt: string): string {
  const date = new Date(createdAt)
  return `Thành viên từ Th${date.getMonth() + 1}/${date.getFullYear()}`
}

export default function ProfileCard({ user, balance, transactionCount, monthlyAverage, streak }: ProfileCardProps) {
  const balanceText = formatCurrency(balance)
  const stats = [
    // Long balances fall back to the compact form so the tile doesn't overflow.
    { label: 'Số dư', value: balanceText.length > 13 ? formatCompactCurrency(balance) : balanceText },
    { label: 'Giao dịch', value: countFormatter.format(transactionCount) },
    { label: 'Chi TB / tháng', value: formatCompactCurrency(monthlyAverage) },
    { label: 'Chuỗi ghi chép', value: `${streak > 0 ? '🔥 ' : ''}${streak} ngày` },
  ]

  return (
    <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-gray-900 to-slate-800 p-6 text-white shadow-lg shadow-gray-900/20">
      <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 rounded-full bg-white/5" />

      <div className="relative flex items-center gap-4">
        <Avatar name={user.fullName || user.username} className="size-18 text-2xl ring-4 ring-white/15" />
        <div className="min-w-0">
          <Text as="p" variant="heading" className="truncate text-2xl">
            {user.fullName || user.username}
          </Text>
          <Text variant="caption" tone="inverse-muted" className="truncate">
            @{user.username}
          </Text>
          {user.createdAt && (
            <Text variant="caption" weight="semibold" className="mt-1 flex items-center gap-1.5 text-green-400">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-green-400" />
              {memberSince(user.createdAt)}
            </Text>
          )}
        </div>
      </div>

      <dl className="relative mt-6 grid grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-4">
            <Text as="dt" variant="caption" tone="inverse-muted" className="truncate">
              {label}
            </Text>
            <Text as="dd" variant="subheading" className="mt-1 truncate text-xl">
              {value}
            </Text>
          </div>
        ))}
      </dl>
    </section>
  )
}
