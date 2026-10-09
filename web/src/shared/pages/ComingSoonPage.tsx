import { Construction } from 'lucide-react'
import PageHeader from '@/shared/layout/PageHeader'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'

interface ComingSoonPageProps {
  title: string
  /** Standalone page opened on top of a tab (needs its own frame and a back button). */
  standalone?: boolean
}

export default function ComingSoonPage({ title, standalone = false }: ComingSoonPageProps) {
  return (
    <div className={cn(standalone && 'pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50')}>
      <PageHeader title={title} back={standalone} />
      <main className="flex flex-col items-center px-5 pt-24 text-center">
        <span className="grid size-20 place-items-center rounded-3xl bg-primary-soft text-primary">
          <Construction className="size-9" />
        </span>
        <Text variant="subheading" as="p" className="mt-5">
          Tính năng đang được phát triển
        </Text>
        <Text tone="muted" className="mt-1">
          Mục “{title}” sẽ sớm ra mắt.
        </Text>
      </main>
    </div>
  )
}
