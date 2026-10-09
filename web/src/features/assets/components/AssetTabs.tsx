import type { AssetKind } from '@/features/assets/useAssets'
import { cn } from '@/shared/utils/cn'

export type AssetTab = 'all' | AssetKind

const TABS: { value: AssetTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'stock', label: 'Cổ phiếu' },
  { value: 'etf', label: 'Quỹ ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'savings', label: 'Tiết kiệm' },
]

export default function AssetTabs({ value, onChange }: { value: AssetTab; onChange: (tab: AssetTab) => void }) {
  return (
    <div role="group" aria-label="Lọc theo loại" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'shrink-0 rounded-full px-5 py-2.5 font-bold transition',
            value === t.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
