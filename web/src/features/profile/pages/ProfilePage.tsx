import { useState } from 'react'
import { Link } from 'react-router'
import { Bell, CalendarClock, ChevronRight, CreditCard, Download, LogOut, MessageSquare, Moon, Shield, Tag } from 'lucide-react'
import type { User } from '@/features/auth/types'
import { useAuth, useCycleStartDay } from '@/features/auth/useAuth'
import { downloadTransactionsCsv } from '@/features/transactions/exportCsv'
import { loggingStreak, monthlyAverageExpense, totalBalance } from '@/features/transactions/stats'
import { useTransactions } from '@/features/transactions/useTransactions'
import PageHeader from '@/shared/layout/PageHeader'
import Text from '@/shared/ui/Text'
import { todayISO } from '@/shared/utils/format'
import CycleSheet from '../components/CycleSheet'
import ProfileCard from '../components/ProfileCard'
import SettingsMenu, { type SettingsItem } from '../components/SettingsMenu'

export default function ProfilePage() {
  const { user, logout, setCycleStartDay } = useAuth()
  const startDay = useCycleStartDay()
  const { transactions } = useTransactions()
  const today = todayISO()
  const [editingCycle, setEditingCycle] = useState(false)

  const settings: SettingsItem[] = [
    { label: 'Tài khoản', description: 'Liên kết ví, ngân hàng · Sắp ra mắt', icon: CreditCard, tone: 'bg-blue-50 text-blue-500', to: '/accounts' },
    {
      label: 'Danh mục',
      description: 'Xem và tạo danh mục thu chi',
      icon: Tag,
      tone: 'bg-primary-soft text-primary',
      to: '/categories',
    },
    {
      label: 'Chu kỳ tháng',
      description: startDay === 1 ? 'Theo tháng dương lịch' : `Từ ngày ${startDay} hằng tháng`,
      icon: CalendarClock,
      tone: 'bg-teal-50 text-teal-600',
      onSelect: () => setEditingCycle(true),
    },
    {
      label: 'Xuất dữ liệu',
      description: transactions.length > 0 ? `Tải ${transactions.length} giao dịch dạng CSV` : 'Chưa có giao dịch để xuất',
      icon: Download,
      tone: 'bg-orange-50 text-orange-500',
      onSelect: () => downloadTransactionsCsv(transactions, today),
      disabled: transactions.length === 0,
    },
    { label: 'Thông báo', description: 'Nhắc ghi chép · Sắp ra mắt', icon: Bell, tone: 'bg-red-50 text-red-500', to: '/notifications' },
    { label: 'Bảo mật', description: 'Đổi mật khẩu · Sắp ra mắt', icon: Shield, tone: 'bg-violet-50 text-violet-500', to: '/security' },
    { label: 'Giao diện', description: 'Chế độ sáng', icon: Moon, tone: 'bg-gray-100 text-gray-700', to: '/appearance' },
  ]

  return (
    <>
      <PageHeader title="Cá nhân" />
      <main className="flex flex-col gap-5 px-5 pt-2 pb-4">
        <ProfileCard
          // Profile is behind RequireAuth, so a user is always present.
          user={user as User}
          balance={totalBalance(transactions)}
          transactionCount={transactions.length}
          monthlyAverage={monthlyAverageExpense(transactions, startDay)}
          streak={loggingStreak(transactions, today)}
        />

        <SettingsMenu items={settings} />

        <Link
          to="/assistant"
          className="flex items-center gap-4 rounded-3xl bg-linear-to-br from-primary to-teal-600 p-4 text-white shadow-lg shadow-primary/20 active:opacity-90"
        >
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
            <MessageSquare className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <Text as="span" weight="bold" className="block truncate">
              Trợ lý tài chính AI
            </Text>
            <Text as="span" variant="caption" tone="inverse-muted" className="block truncate">
              Gợi ý và phân tích riêng cho bạn · Sắp ra mắt
            </Text>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-white/70" />
        </Link>

        <button
          type="button"
          onClick={logout}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 font-bold text-red-600 active:bg-red-100"
        >
          <LogOut className="size-5" /> Đăng xuất
        </button>

        <Text variant="caption" tone="muted" className="text-center text-xs">
          Money Management · Làm với ❤️
        </Text>
      </main>

      {editingCycle && (
        <CycleSheet startDay={startDay} onSave={setCycleStartDay} onClose={() => setEditingCycle(false)} />
      )}
    </>
  )
}
