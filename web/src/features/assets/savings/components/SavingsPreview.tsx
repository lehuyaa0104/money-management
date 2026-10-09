import { savingsStatus } from '@/features/assets/savings/savingsStats'
import type { SavingsDetails } from '@/features/assets/savings/types'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'
import { formatCurrency, formatDate, todayISO } from '@/shared/utils/format'

/** Live summary of the deposit being entered, as of today (renewals included). */
export default function SavingsPreview({ details }: { details: SavingsDetails }) {
  const s = savingsStatus({ id: '', kind: 'savings', name: '', details }, todayISO())
  const rows: [string, string][] = [['Tiền gốc hiện tại', formatCurrency(s.principal)]]
  if (s.maturity) {
    rows.push([s.closed ? 'Đã đáo hạn ngày' : 'Đáo hạn ngày', formatDate(s.maturity)])
    rows.push(['Lãi kỳ này', `+${formatCurrency(s.interest)}`])
  } else {
    rows.push(['Lãi tạm tính đến hôm nay', `+${formatCurrency(s.interest)}`])
  }
  return (
    <Card className="bg-primary-soft/60 shadow-none">
      <Text variant="label" tone="muted">
        Xem trước
      </Text>
      <dl className="mt-2 flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt>
              <Text as="span" variant="caption" tone="muted">
                {label}
              </Text>
            </dt>
            <dd>
              <Text as="span" weight="bold" className="text-sm">
                {value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
