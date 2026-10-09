import BankLogo from '@/features/assets/savings/components/BankLogo'
import { savingsStatus } from '@/features/assets/savings/savingsStats'
import { termLabel } from '@/features/assets/savings/savingsOptions'
import type { SavingsAsset } from '@/features/assets/useAssets'
import Text from '@/shared/ui/Text'
import { formatCompactCurrency, formatCurrency, formatDate, todayISO } from '@/shared/utils/format'

const rateFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export default function SavingsCard({ asset: a, onSelect }: { asset: SavingsAsset; onSelect: () => void }) {
  const d = a.details
  const s = savingsStatus(a, todayISO())
  const term = d.termMonths > 0
  // Only inline elements inside the button, so screen readers read it as one control.
  return (
    <button type="button" onClick={onSelect} className="block w-full rounded-3xl bg-white p-5 text-left shadow-sm active:bg-gray-50">
      <span className="flex items-center gap-3">
        <BankLogo bank={d.bank} className="h-12 w-20" />
        <span className="min-w-0 flex-1">
          <Text as="span" weight="bold" className="block truncate">
            {a.name || d.bank}
          </Text>
          <Text as="span" variant="caption" tone="muted" className="block truncate">
            {a.name ? `${d.bank} · ` : ''}
            {termLabel(d.termMonths)}
          </Text>
        </span>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">{rateFormat.format(d.rate)}%/năm</span>
      </span>

      <span className="mt-4 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <Text as="span" variant="caption" tone="muted" className="block">
            Tiền gốc
          </Text>
          <Text as="span" variant="heading" className="block truncate">
            {formatCurrency(s.principal)}
          </Text>
        </span>
        <span className="shrink-0 text-right">
          <Text as="span" variant="caption" tone="muted" className="block">
            {term ? 'Lãi kỳ này' : 'Lãi tạm tính'}
          </Text>
          <Text as="span" variant="heading" tone="primary" className="block">
            +{formatCompactCurrency(s.interest)}
          </Text>
        </span>
      </span>

      {s.maturity && (
        <>
          <span className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <Text as="span" variant="caption" tone="muted">
              {s.closed ? 'Đã đáo hạn' : 'Đáo hạn'} {formatDate(s.maturity)}
            </Text>
            <Text as="span" weight="bold" className="text-sm">
              {s.closed ? 'Đã tất toán' : `Còn ${s.daysLeft} ngày`}
            </Text>
          </span>
          <span
            role="progressbar"
            aria-label="Tiến độ kỳ hạn"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(s.progress * 100)}
            className="mt-2 block h-2 overflow-hidden rounded-full bg-gray-100"
          >
            <span className="block h-full rounded-full bg-blue-600" style={{ width: `${s.progress * 100}%` }} />
          </span>
        </>
      )}
    </button>
  )
}
