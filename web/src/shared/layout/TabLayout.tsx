import { Outlet } from 'react-router'
import BottomNav from './BottomNav'

/** Pages reachable from the bottom tab bar. */
export default function TabLayout() {
  return (
    <div className="pb-tabbar mx-auto min-h-dvh max-w-120 bg-gray-50">
      <Outlet />
      <BottomNav />
    </div>
  )
}
