import { Controller, useForm } from 'react-hook-form'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import TextField from '@/shared/ui/TextField'
import { decimalInput, parseDecimal, todayISO } from '@/shared/utils/format'

interface NavSheetProps {
  code: string
  nav: number
  onSave: (nav: number, date: string) => Promise<void>
  onClose: () => void
}

/** Manual NAV update. shortcut: typed by the user; the API will fetch the latest NAV once it exists. */
export default function NavSheet({ code, nav, onSave, onClose }: NavSheetProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onChange', defaultValues: { nav: decimalInput(nav), date: todayISO() } })

  return (
    <BottomSheet
      title={`Cập nhật NAV ${code}`}
      onClose={onClose}
      footer={
        <Button type="submit" form="nav-form" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu…' : 'Lưu NAV'}
        </Button>
      }
    >
      <form id="nav-form" noValidate onSubmit={handleSubmit((v) => onSave(parseDecimal(v.nav), v.date))} className="flex flex-col gap-5 pt-2">
        <Controller
          name="nav"
          control={control}
          rules={{ validate: (v) => parseDecimal(v) > 0 || 'Nhập NAV' }}
          render={({ field, fieldState }) => (
            <MoneyField
              label="NAV/CCQ"
              fractionDigits={2}
              autoFocus
              ref={field.ref}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextField
          label="Ngày NAV"
          type="date"
          max={todayISO()}
          error={errors.date?.message}
          {...register('date', { validate: (v) => (v !== '' && v <= todayISO()) || 'Không được sau hôm nay' })}
        />
      </form>
    </BottomSheet>
  )
}
