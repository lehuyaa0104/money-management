import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AtSign, Check, ChevronLeft, User, Wallet } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import PasswordField from '@/shared/ui/PasswordField'
import TextField from '@/shared/ui/TextField'
import Text from '@/shared/ui/Text'
import { AuthError } from '@/features/auth/authService'
import { cn } from '@/shared/utils/cn'
import { PASSWORD_MIN, validateFullName, validatePassword, validateUsername } from '@/features/auth/validation'

// API error codes are prefixed by the field they concern (see api/internal/domain/user.go).
const FIELD_BY_CODE_PREFIX: [string, 'fullName' | 'username' | 'password'][] = [
  ['full_name_', 'fullName'],
  ['username_', 'username'],
  ['password_', 'password'],
]

interface RegisterValues {
  fullName: string
  username: string
  password: string
  confirm: string
  acceptTerms: boolean
}

export default function RegisterPage() {
  const { register: registerAccount } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    mode: 'onChange', // validate while typing, not only on submit
    defaultValues: { fullName: '', username: '', password: '', confirm: '', acceptTerms: false },
  })

  const onSubmit = async ({ fullName, username, password }: RegisterValues) => {
    try {
      // On success, GuestOnly redirects to the home page.
      await registerAccount({ fullName: fullName.trim(), username: username.trim(), password })
    } catch (err) {
      if (!(err instanceof AuthError)) {
        setError('root.server', { message: 'Đã có lỗi xảy ra, vui lòng thử lại' })
        return
      }
      // Show field errors (e.g. "Tên đăng nhập đã tồn tại") under the field itself.
      const field = FIELD_BY_CODE_PREFIX.find(([prefix]) => err.code?.startsWith(prefix))?.[1]
      if (field) setError(field, { message: err.message }, { shouldFocus: true })
      else setError('root.server', { message: err.message })
    }
  }

  return (
    <div className="pt-safe-header pb-safe mx-auto flex min-h-dvh max-w-120 flex-col bg-white px-6">
      <header className="flex items-center gap-4 py-2">
        <button
          type="button"
          onClick={() => navigate('/login')}
          aria-label="Quay lại đăng nhập"
          className="grid size-12 place-items-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 active:bg-gray-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft">
          <Wallet className="size-6 text-primary" strokeWidth={2.2} />
        </div>
        <Text as="span" variant="subheading">
          Money Management
        </Text>
      </header>

      <Text variant="title" className="mt-6">
        Tạo tài khoản ✨
      </Text>
      <Text tone="muted" className="mt-2">
        Bắt đầu hành trình tài chính của bạn
      </Text>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}

        <TextField
          label="Họ và tên"
          icon={User}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName', { validate: (v) => validateFullName(v.trim()) ?? true })}
        />

        <TextField
          label="Tên đăng nhập"
          icon={AtSign}
          placeholder="nguyenvana"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username', { validate: (v) => validateUsername(v.trim()) ?? true })}
        />

        <PasswordField
          label="Mật khẩu"
          placeholder={`Tối thiểu ${PASSWORD_MIN} ký tự`}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            validate: (v) => validatePassword(v) ?? true,
            // Re-check the confirmation against the new password, but only once
            // the user has typed something there.
            onChange: () => {
              if (getValues('confirm')) void trigger('confirm')
            },
          })}
        />

        <PasswordField
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          toggleable={false}
          error={errors.confirm?.message}
          {...register('confirm', {
            validate: (v, values) => v === values.password || 'Mật khẩu nhập lại không khớp',
          })}
        />

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3">
            <span className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className={cn(
                  'peer block size-6 cursor-pointer appearance-none rounded-lg border-2 bg-white transition',
                  'checked:border-primary checked:bg-primary',
                  errors.acceptTerms ? 'border-red-400' : 'border-gray-300',
                )}
                {...register('acceptTerms', { required: 'Vui lòng đồng ý với điều khoản để tiếp tục' })}
              />
              <Check
                className="pointer-events-none absolute inset-0 m-auto hidden size-4 text-white peer-checked:block"
                strokeWidth={3}
              />
            </span>
            <Text as="span" tone="subtle">
              Tôi đồng ý với{' '}
              <Text as="span" weight="bold" tone="primary">
                Điều khoản dịch vụ
              </Text>{' '}
              và{' '}
              <Text as="span" weight="bold" tone="primary">
                Chính sách bảo mật
              </Text>
            </Text>
          </label>
          {errors.acceptTerms && (
            <Text variant="caption" tone="danger">
              {errors.acceptTerms.message}
            </Text>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>
      </form>

      <Text tone="muted" className="mt-8 text-center">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-bold text-primary">
          Đăng nhập
        </Link>
      </Text>
    </div>
  )
}
