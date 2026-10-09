import { Controller, useForm } from 'react-hook-form'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
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

/** Manual NAV update, for funds the API has no published NAV for (or when it's unreachable). */
export default function NavSheet({ code, nav, onSave, onClose }: NavSheetProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
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
      <form id="nav-form" noValidate onSubmit={handleSubmit(async (v) => {
          try {
            await onSave(parseDecimal(v.nav), v.date)
          } catch (err) {
            setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
          }
        })} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
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
