import Text from '@/shared/ui/Text'

export default function SectionTitle({ title, extra }: { title: string; extra?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <Text as="h2" variant="label" tone="muted" className="tracking-wide uppercase">
        {title}
      </Text>
      {extra && (
        <Text as="span" weight="bold" tone="primary" className="text-sm">
          {extra}
        </Text>
      )}
    </div>
  )
}
