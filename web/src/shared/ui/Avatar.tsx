import { cn } from '@/shared/utils/cn'

/** "Nguyễn Văn A" → "NA", "demo_user" → "DE" */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase()
}

interface AvatarProps {
  name: string
  className?: string
}

export default function Avatar({ name, className }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-teal-600 font-bold text-white',
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
