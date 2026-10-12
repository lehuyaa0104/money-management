import type { DebtPayment } from '@/features/assets/debts/types'
import Text from '@/shared/ui/Text'
import { formatCurrency, formatDate } from '@/shared/utils/format'

export default function DebtPaymentRow({ payment, onSelect }: { payment: DebtPayment; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-gray-50">
      <Text as="span" weight="semibold">
        {formatDate(payment.date)}
      </Text>
      <Text as="span" weight="bold" className="text-primary">
        −{formatCurrency(payment.amount)}
      </Text>
    </button>
  )
}
