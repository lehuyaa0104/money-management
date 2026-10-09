import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DRAGON_CAPITAL_FUNDS } from '@/features/assets/funds/fundOptions'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'

interface FundPickerSheetProps {
  onPick: (code: string, name: string) => void
  onClose: () => void
}

/** Which fund to add: one of Dragon Capital's, or any other code. */
export default function FundPickerSheet({ onPick, onClose }: FundPickerSheetProps) {
  const [other, setOther] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  return (
    <BottomSheet title="Chọn quỹ" onClose={onClose}>
      <div className="flex flex-col gap-2 pt-2 pb-2">
        <Text variant="label" tone="muted">
          Dragon Capital
        </Text>
        <ul className="flex flex-col gap-2">
          {DRAGON_CAPITAL_FUNDS.map((f) => (
            <li key={f.code}>
              <button
                type="button"
                onClick={() => onPick(f.code, f.name)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 p-3 text-left active:bg-gray-50"
              >
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-xs font-bold text-violet-600">
                  {f.code}
                </span>
                <Text as="span" weight="semibold" className="min-w-0 flex-1 text-sm">
                  {f.name}
                </Text>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-gray-300" />
              </button>
            </li>
          ))}
        </ul>
        {other ? (
          <form
            className="mt-2 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) onPick(code, name)
            }}
          >
            <div className="grid grid-cols-[2fr_3fr] gap-3">
              <TextField label="Mã quỹ" placeholder="vd: VESAF" maxLength={15} autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
              <TextField label="Tên quỹ (không bắt buộc)" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={!code.trim()}>
              Tiếp tục
            </Button>
          </form>
        ) : (
          <Button variant="outline" className="mt-2" onClick={() => setOther(true)}>
            Quỹ khác
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
