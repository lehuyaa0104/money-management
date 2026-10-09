import { Navigate, Route, Routes } from 'react-router'
import { GuestOnly, RequireAuth } from './features/auth/RouteGuards'
import TabLayout from './shared/layout/TabLayout'
import AddTransactionPage from './features/transactions/pages/AddTransactionPage'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage'
import CategoriesPage from './features/categories/pages/CategoriesPage'
import CategoriesProvider from './features/categories/CategoriesProvider'
import NewCategoryPage from './features/categories/pages/NewCategoryPage'
import BudgetPage from './features/budgets/pages/BudgetPage'
import GoalsPage from './features/goals/pages/GoalsPage'
import CalendarPage from './features/transactions/pages/CalendarPage'
import ComingSoonPage from './shared/pages/ComingSoonPage'
import HomePage from './features/home/pages/HomePage'
import LoginPage from './features/auth/pages/LoginPage'
import ProfilePage from './features/profile/pages/ProfilePage'
import RegisterPage from './features/auth/pages/RegisterPage'
import TransactionsPage from './features/transactions/pages/TransactionsPage'
import TransactionsProvider from './features/transactions/TransactionsProvider'

export default function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        {/* Loaded once after sign-in and shared by every page below. */}
        <Route element={<CategoriesProvider />}>
          <Route element={<TransactionsProvider />}>
            <Route element={<TabLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/calendar" element={<CalendarPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/budget/goals" element={<GoalsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/transactions/new" element={<AddTransactionPage />} />
            <Route path="/transfer" element={<ComingSoonPage title="Chuyển tiền" standalone />} />
            <Route path="/notifications" element={<ComingSoonPage title="Thông báo" standalone />} />
            <Route path="/accounts" element={<ComingSoonPage title="Tài khoản" standalone />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/new" element={<NewCategoryPage />} />
            <Route path="/security" element={<ComingSoonPage title="Bảo mật" standalone />} />
            <Route path="/appearance" element={<ComingSoonPage title="Giao diện" standalone />} />
            <Route path="/assistant" element={<ComingSoonPage title="Trợ lý tài chính AI" standalone />} />
          </Route>
        </Route>
      </Route>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
