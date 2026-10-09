import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'

export interface SettingsItem {
  label: string
  description: string
  icon: LucideIcon
  /** Icon tile colors, e.g. "bg-blue-50 text-blue-500". */
  tone: string
  /** Navigates to this route… */
  to?: string
  /** …or runs this action. */
  onSelect?: () => void
  disabled?: boolean
}

function Row({ item }: { item: SettingsItem }) {
  const Icon = item.icon
  const content: ReactNode = (
    <>
      <span aria-hidden="true" className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', item.tone)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" weight="bold" className="block truncate">
          {item.label}
        </Text>
        <Text as="span" variant="caption" tone="muted" className="block truncate">
          {item.description}
        </Text>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-gray-300" />
    </>
  )
  const className = 'flex w-full items-center gap-4 rounded-2xl px-2 py-3.5 text-left transition active:bg-gray-50 disabled:opacity-50'

  return item.to ? (
    <Link to={item.to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={item.onSelect} disabled={item.disabled} className={className}>
      {content}
    </button>
  )
}

export default function SettingsMenu({ items }: { items: SettingsItem[] }) {
  return (
    <Card className="px-3 py-1">
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.label}>
            <Row item={item} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
