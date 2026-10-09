import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { bankLogo } from '@/features/assets/savings/savingsOptions'
import { cn } from '@/shared/utils/cn'

/** A listed bank's logo on a white tile; a generic bank icon for other names or if the image fails. */
export default function BankLogo({ bank, className }: { bank: string; className?: string }) {
  const src = bankLogo(bank)
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-gray-100 bg-white', className)}>
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(src)} className="size-full object-contain" />
      ) : (
        <Landmark className="size-5 text-blue-600" />
      )}
    </span>
  )
}
