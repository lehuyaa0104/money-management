import { useState } from 'react'
import { Link } from 'react-router'
import { Bell } from 'lucide-react'
import Avatar from '@/shared/ui/Avatar'
import Text from '@/shared/ui/Text'

function greeting(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng,'
  if (hour < 18) return 'Chào buổi chiều,'
  return 'Chào buổi tối,'
}

export default function HomeHeader({ name }: { name: string }) {
  // Read the clock once per mount, not on every render.
  const [hour] = useState(() => new Date().getHours())

  return (
    <header className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <Text variant="caption" tone="muted">
          {greeting(hour)}
        </Text>
        <Text as="p" variant="subheading" className="truncate">
          {name} 👋
        </Text>
      </div>
      <Link
        to="/notifications"
        aria-label="Thông báo"
        className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-gray-700 shadow-sm active:bg-gray-100"
      >
        <Bell className="size-5" />
      </Link>
    </header>
  )
}
