import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { changePassword } from '@/features/auth/authService'
import { PASSWORD_MIN, validatePassword } from '@/features/auth/validation'
import PageHeader from '@/shared/layout/PageHeader'
import { ApiError } from '@/shared/api/apiClient'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import PasswordField from '@/shared/ui/PasswordField'

interface Values {
  current: string
  next: string
  confirm: string
}

const EMPTY: Values = { current: '', next: '', confirm: '' }

export default function ChangePasswordPage() {
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ mode: 'onChange', defaultValues: EMPTY })

  const onSubmit = async ({ current, next }: Values) => {
    setDone(false)
    try {
      await changePassword(current, next)
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError('root.server', { message: 'Đã có lỗi xảy ra, vui lòng thử lại' })
      } else if (err.code === 'current_password_wrong') {
        setError('current', { message: err.message }, { shouldFocus: true })
      } else if (err.code.startsWith('password_')) {
        setError('next', { message: err.message }, { shouldFocus: true })
      } else {
        setError('root.server', { message: err.message })
      }
      return
    }
    reset(EMPTY)
    setDone(true)
  }

  return (
    <div className="pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50">
      <PageHeader title="Đổi mật khẩu" back fallback="/profile" />
      <main className="px-5 pt-2">
        <Card>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {done && <Alert tone="info">Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.</Alert>}
            {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}

            <PasswordField
              label="Mật khẩu hiện tại"
              autoComplete="current-password"
              error={errors.current?.message}
              {...register('current', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
            />
            <PasswordField
              label="Mật khẩu mới"
              placeholder={`Tối thiểu ${PASSWORD_MIN} ký tự`}
              autoComplete="new-password"
              error={errors.next?.message}
              {...register('next', {
                validate: (v) => validatePassword(v) ?? true,
                onChange: () => {
                  if (getValues('confirm')) void trigger('confirm')
                },
              })}
            />
            <PasswordField
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              toggleable={false}
              error={errors.confirm?.message}
              {...register('confirm', {
                validate: (v, values) => v === values.next || 'Mật khẩu nhập lại không khớp',
              })}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
