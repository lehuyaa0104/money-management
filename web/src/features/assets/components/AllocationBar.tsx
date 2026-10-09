import { ASSET_KINDS } from '@/features/assets/assetKinds'
import type { AssetKind } from '@/features/assets/useAssets'
import { formatCurrency } from '@/shared/utils/format'
import SectionTitle from './SectionTitle'

/** Share of the net worth in each kind of asset; kinds with nothing are left out. */
export default function AllocationBar({ byKind }: { byKind: Record<AssetKind, number> }) {
  const kinds = (Object.keys(ASSET_KINDS) as AssetKind[]).filter((k) => byKind[k] > 0)
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title="Phân bổ tài sản" />
      <div aria-hidden="true" className="flex h-2.5 gap-1">
        {kinds.map((k) => (
          <div key={k} className="rounded-full" style={{ flexGrow: byKind[k], backgroundColor: ASSET_KINDS[k].color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {kinds.map((k) => (
          <li key={k} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: ASSET_KINDS[k].color }} />
            {ASSET_KINDS[k].label}
            <span className="sr-only">: {formatCurrency(byKind[k])}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
