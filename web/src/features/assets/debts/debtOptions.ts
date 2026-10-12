import { CreditCard, Handshake, Landmark, ReceiptText, type LucideIcon } from 'lucide-react'
import type { DebtType } from './types'

export const DEBT_TYPES: { value: DebtType; label: string; icon: LucideIcon }[] = [
  { value: 'bank', label: 'Vay ngân hàng', icon: Landmark },
  { value: 'credit_card', label: 'Thẻ tín dụng', icon: CreditCard },
  { value: 'personal', label: 'Vay người quen', icon: Handshake },
  { value: 'other', label: 'Khác', icon: ReceiptText },
]

export const debtType = (type: DebtType) => DEBT_TYPES.find((t) => t.value === type) ?? DEBT_TYPES[3]
