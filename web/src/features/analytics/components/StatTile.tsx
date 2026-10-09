import type { ReactNode } from 'react'
import Card from '@/shared/ui/Card'
import Text, { type TextTone } from '@/shared/ui/Text'

interface StatTileProps {
  label: string
  value: ReactNode
  note?: ReactNode
  noteTone?: TextTone
}

export default function StatTile({ label, value, note, noteTone = 'muted' }: StatTileProps) {
  return (
    <Card className="flex min-w-0 flex-col gap-1">
      <Text variant="caption" tone="muted" className="truncate">
        {label}
      </Text>
      <Text as="p" variant="heading" className="truncate">
        {value}
      </Text>
      {note && (
        <Text variant="caption" tone={noteTone} weight="semibold" className="truncate text-xs">
          {note}
        </Text>
      )}
    </Card>
  )
}
