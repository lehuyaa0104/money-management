import { ChevronRight } from 'lucide-react'
import { ASSET_KINDS } from '@/features/assets/assetKinds'
import type { AssetKind } from '@/features/assets/useAssets'
import BottomSheet from '@/shared/ui/BottomSheet'
import Text from '@/shared/ui/Text'
import { cn } from '@/shared/utils/cn'

const CHOICES: { kind: AssetKind; title: string; hint: string }[] = [
  { kind: 'savings', title: 'Tiết kiệm ngân hàng', hint: 'Sổ tiết kiệm có hoặc không kỳ hạn' },
  { kind: 'fund', title: 'Chứng chỉ quỹ mở', hint: 'Quỹ mở như DCDS, DCBF của Dragon Capital' },
  { kind: 'stock', title: 'Cổ phiếu & ETF', hint: 'Niêm yết trên HOSE, HNX, UPCOM' },
  { kind: 'crypto', title: 'Crypto', hint: 'Bitcoin, Ethereum và các đồng khác' },
]

/** First step of adding an asset: each kind has its own form. */
export default function AssetKindPicker({ onPick, onClose }: { onPick: (kind: AssetKind) => void; onClose: () => void }) {
  return (
    <BottomSheet title="Thêm tài sản" onClose={onClose}>
      <ul className="flex flex-col gap-2 pt-2 pb-2">
        {CHOICES.map(({ kind, title, hint }) => {
          const Icon = ASSET_KINDS[kind].icon
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onPick(kind)}
                className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 p-3 text-left active:bg-gray-50"
              >
                <span aria-hidden="true" className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', ASSET_KINDS[kind].tile)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <Text as="span" weight="bold" className="block">
                    {title}
                  </Text>
                  <Text as="span" variant="caption" tone="muted" className="block">
                    {hint}
                  </Text>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-gray-300" />
              </button>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
