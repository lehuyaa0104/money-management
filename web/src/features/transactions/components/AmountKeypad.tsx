import { Delete } from 'lucide-react'
import { KEYPAD_KEYS, type KeypadKey } from '@/features/transactions/amountInput'

interface AmountKeypadProps {
  onKey: (key: KeypadKey) => void
}

export default function AmountKeypad({ onKey }: AmountKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYPAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          aria-label={key === 'back' ? 'Xóa số cuối' : key}
          className="grid h-16 place-items-center rounded-2xl bg-white text-2xl font-semibold text-gray-900 shadow-sm transition active:scale-95 active:bg-gray-100"
        >
          {key === 'back' ? <Delete className="size-6" /> : key}
        </button>
      ))}
    </div>
  )
}
