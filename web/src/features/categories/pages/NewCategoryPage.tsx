import { useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Check } from 'lucide-react'
import type { TransactionType } from '@/features/transactions/types'
import { ApiError } from '@/shared/api/apiClient'
import PageHeader from '@/shared/layout/PageHeader'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'
import { cn } from '@/shared/utils/cn'
import { CATEGORY_COLORS } from '../colors'
import CategoryTile from '../components/CategoryTile'
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES } from '../icons'
import { useCategories } from '../useCategories'

const NAME_MAX = 30

interface FormValues {
  type: TransactionType
  name: string
  icon: string
  color: string
}

export default function NewCategoryPage() {
  const navigate = useNavigate()
  const { create } = useCategories()
  const location = useLocation()
  const [params] = useSearchParams()
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      type: params.get('type') === 'income' ? 'income' : 'expense',
      name: '',
      icon: CATEGORY_ICON_NAMES[0],
      color: CATEGORY_COLORS[0],
    },
  })
  const [type, name, icon, color] = useWatch({ control, name: ['type', 'name', 'icon', 'color'] })

  const onSubmit = async (values: FormValues) => {
    try {
      await create({ ...values, name: values.name.trim() })
      // Back to the list (it refetches); opened directly, go to the list for this type.
      if (location.key === 'default') navigate(`/categories?type=${values.type}`, { replace: true })
      else navigate(-1)
    } catch (err) {
      if (err instanceof ApiError && (err.code.startsWith('name_') || err.code === 'category_name_taken')) {
        setError('name', { message: err.message }, { shouldFocus: true })
      } else {
        setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
      }
    }
  }

  return (
    <div className="pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50">
      <PageHeader title="Danh mục mới" back centered fallback="/categories" />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-5 pt-2 pb-6">
        {/* Live preview */}
        <Card className="flex items-center gap-4">
          <CategoryTile icon={icon} color={color} className="size-16 rounded-3xl" iconClassName="size-7" />
          <div className="min-w-0">
            <Text as="p" variant="subheading" tone={name.trim() ? 'default' : 'muted'} className="truncate">
              {name.trim() || 'Tên danh mục'}
            </Text>
            <Text variant="caption" tone="muted">
              {type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </div>
        </Card>

        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}

        <SegmentedControl
          label="Loại danh mục"
          value={type}
          onChange={(t) => setValue('type', t)}
          options={[
            { value: 'expense', label: 'Chi tiêu', activeClass: 'text-red-600' },
            { value: 'income', label: 'Thu nhập', activeClass: 'text-primary' },
          ]}
        />

        <TextField
          label="Tên danh mục"
          placeholder="vd: Cà phê"
          maxLength={NAME_MAX}
          error={errors.name?.message}
          {...register('name', {
            validate: (v) => {
              const trimmed = v.trim()
              if (!trimmed) return 'Vui lòng nhập tên danh mục'
              if (trimmed.length > NAME_MAX) return `Tên danh mục tối đa ${NAME_MAX} ký tự`
              return true
            },
          })}
        />

        <div className="flex flex-col gap-3">
          <Text as="span" variant="label" tone="muted">
            Icon
          </Text>
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-2 rounded-3xl bg-white p-3 shadow-sm">
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const Icon = CATEGORY_ICONS[iconName]
              const selected = iconName === icon
              return (
                <button
                  key={iconName}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={iconName}
                  onClick={() => setValue('icon', iconName)}
                  className={cn(
                    'grid aspect-square place-items-center rounded-2xl transition',
                    selected ? 'ring-2 ring-offset-2' : 'text-gray-500 active:bg-gray-100',
                  )}
                  style={selected ? { backgroundColor: `${color}1a`, color, ['--tw-ring-color' as string]: color } : undefined}
                >
                  <Icon className="size-5" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Text as="span" variant="label" tone="muted">
            Màu
          </Text>
          <div role="radiogroup" aria-label="Màu" className="grid grid-cols-6 gap-3">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                onClick={() => setValue('color', c)}
                className={cn(
                  'grid aspect-square place-items-center rounded-full text-white transition',
                  c === color && 'ring-2 ring-gray-900 ring-offset-2',
                )}
                style={{ backgroundColor: c }}
              >
                {c === color && <Check className="size-5" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Đang lưu…' : 'Tạo danh mục'}
        </Button>
      </form>
    </div>
  )
}
