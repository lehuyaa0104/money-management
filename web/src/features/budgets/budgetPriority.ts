import type { BudgetPriority } from './budgetApi'

/** The priorities, most important first: the order the budget page groups them in. */
export const BUDGET_PRIORITIES: { value: BudgetPriority; label: string; hint: string }[] = [
  { value: 'essential', label: 'Thiết yếu', hint: 'Bắt buộc phải chi: nhà, điện nước, ăn uống' },
  { value: 'important', label: 'Quan trọng', hint: 'Nên chi, có thể điều chỉnh một chút' },
  { value: 'optional', label: 'Có thể cắt giảm', hint: 'Cắt đầu tiên khi sắp hết tiền' },
]
