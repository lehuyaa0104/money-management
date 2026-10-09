import { Link } from 'react-router'
import { useAuth } from '@/features/auth/useAuth'
import BalanceCard from '@/features/home/components/BalanceCard'
import CategoryBreakdownCard from '@/features/home/components/CategoryBreakdownCard'
import HomeHeader from '@/features/home/components/HomeHeader'
import QuickActions from '@/features/home/components/QuickActions'
import WeeklySpendingCard from '@/features/home/components/WeeklySpendingCard'
import TransactionGroups from '@/features/transactions/components/TransactionGroups'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { useTransactions } from '@/features/transactions/useTransactions'
import type { User } from '@/features/auth/types'

const RECENT_LIMIT = 5

export default function HomePage() {
  const { user } = useAuth()
  // RequireAuth guarantees a signed-in user on this page.
  const { username, fullName } = user as User
  const { transactions } = useTransactions()

  return (
    <main className="pt-safe-header flex flex-col gap-6 px-5">
      <HomeHeader name={fullName || username} />
      <BalanceCard transactions={transactions} />
      <QuickActions />
      <WeeklySpendingCard transactions={transactions} />
      <CategoryBreakdownCard transactions={transactions} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Text as="h2" variant="subheading">
            Gần đây
          </Text>
          <Link to="/transactions" className="font-bold text-primary">
            Xem tất cả
          </Link>
        </div>
        {transactions.length > 0 ? (
          <TransactionGroups transactions={transactions} limit={RECENT_LIMIT} />
        ) : (
          <Card>
            <Text tone="muted" className="py-4 text-center">
              Chưa có giao dịch nào. Bấm “Chi tiêu” hoặc “Thu nhập” ở trên để thêm.
            </Text>
          </Card>
        )}
      </section>
    </main>
  )
}
