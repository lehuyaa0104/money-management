import { cn } from '@/shared/utils/cn'
import { CATEGORY_ICONS, FALLBACK_ICON } from '../icons'

interface CategoryTileProps {
  icon: string
  color: string
  className?: string
  iconClassName?: string
}

/** The colored rounded square with a category's icon. */
export default function CategoryTile({ icon, color, className, iconClassName }: CategoryTileProps) {
  const Icon = CATEGORY_ICONS[icon] ?? FALLBACK_ICON
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', className)}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <Icon className={cn('size-5', iconClassName)} />
    </span>
  )
}
