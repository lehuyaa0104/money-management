import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { User } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import AuthLayout from '@/features/auth/components/AuthLayout'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import PasswordField from '@/shared/ui/PasswordField'
import TextField from '@/shared/ui/TextField'
import Text from '@/shared/ui/Text'
import { AuthError } from '@/features/auth/authService'

interface LoginValues {
  username: string
  password: string
}

const COMING_SOON = 'Tính năng này sẽ sớm ra mắt.'

export default function LoginPage() {
  const { login } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    mode: 'onChange', // validate while typing, not only on submit
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async ({ username, password }: LoginValues) => {
    setNotice(null)
    try {
      // On success, GuestOnly redirects to the home page.
      await login(username.trim(), password)
    } catch (err) {
      setError('root.server', {
        message: err instanceof AuthError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại',
      })
    }
  }

  return (
    <AuthLayout title="Welcome back 👋" subtitle="Đăng nhập vào tài khoản của bạn">
      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        <TextField
          label="Tên đăng nhập"
          icon={User}
          placeholder="nguyenvana"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username', {
            validate: (v) => v.trim() !== '' || 'Vui lòng nhập tên đăng nhập',
          })}
        />

        <div className="flex flex-col gap-3">
          <PasswordField
            label="Mật khẩu"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
          />
          <button
            type="button"
            onClick={() => setNotice(COMING_SOON)}
            className="self-end text-sm font-bold text-primary"
          >
            Quên mật khẩu?
          </button>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-gray-200" />
        <Text as="span" variant="caption" tone="muted">
          hoặc tiếp tục với
        </Text>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => setNotice(COMING_SOON)}>
          <span className="text-lg font-bold">G</span> Google
        </Button>
        <Button variant="outline" onClick={() => setNotice(COMING_SOON)}>
          <span aria-hidden="true">🍎</span> Apple
        </Button>
      </div>

      <Text tone="muted" className="mt-8 text-center">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold text-primary">
          Đăng ký ngay
        </Link>
      </Text>
    </AuthLayout>
  )
}
