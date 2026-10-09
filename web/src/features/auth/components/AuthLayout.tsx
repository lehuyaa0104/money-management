import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import Text from '@/shared/ui/Text'

interface AuthLayoutProps {
  title: ReactNode
  subtitle: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col bg-white">
      <header className="pt-safe-hero relative overflow-hidden bg-linear-to-br from-primary to-teal-600 px-6 pb-16 text-center text-white">
        <div aria-hidden="true" className="absolute -top-12 -right-20 size-60 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute top-28 -left-24 size-44 rounded-full bg-white/10" />

        <div className="relative">
          <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-white shadow-xl shadow-black/10">
            <Wallet className="size-9 text-primary" strokeWidth={2.2} />
          </div>
          <Text as="p" variant="title" className="mt-6">
            Money Management
          </Text>
          <Text tone="inverse-muted" className="mt-2">
            Smart money, smarter life
          </Text>
        </div>
      </header>

      <main className="pb-safe flex-1 px-6 pt-6">
        <Text variant="title">{title}</Text>
        <Text tone="muted" className="mt-2">
          {subtitle}
        </Text>
        {children}
      </main>
    </div>
  )
}
