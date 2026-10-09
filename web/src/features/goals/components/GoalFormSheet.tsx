import { useState, type ChangeEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Check, ImagePlus, X } from 'lucide-react'
import type { Goal, GoalColor, GoalInput } from '@/features/goals/useGoals'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/utils/cn'
import { todayISO } from '@/shared/utils/format'
import { GOAL_ACCENTS, GOAL_COLORS } from '@/features/goals/goalColors'
import { compressImage } from '@/shared/utils/image'
import { monthKey } from '@/features/transactions/stats'
import Alert from '@/shared/ui/Alert'
import BottomSheet from '@/shared/ui/BottomSheet'
import Button from '@/shared/ui/Button'
import MoneyField from '@/shared/ui/MoneyField'
import Text from '@/shared/ui/Text'
import TextField from '@/shared/ui/TextField'
import GoalCover from './GoalCover'

interface FormValues {
  name: string
  target: string
  saved: string
  deadline: string
  color: GoalColor
  image: string
}

interface GoalFormSheetProps {
  /** Existing goal to edit; omit to create a new one. */
  goal?: Goal
  /** Async; on failure the sheet shows the error and stays open. */
  onSave: (input: GoalInput) => Promise<void>
  onClose: () => void
}

export default function GoalFormSheet({ goal, onSave, onClose }: GoalFormSheetProps) {
  const [imageError, setImageError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      name: goal?.name ?? '',
      target: goal ? String(goal.target) : '',
      saved: goal?.saved ? String(goal.saved) : '',
      deadline: goal?.deadline ?? '',
      color: goal?.color ?? 'blue',
      image: goal?.image ?? '',
    },
  })
  const [color, image] = useWatch({ control, name: ['color', 'image'] })

  const pickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setImageError(null)
    setProcessing(true)
    try {
      setValue('image', await compressImage(file))
    } catch {
      setImageError('Không đọc được ảnh này, vui lòng chọn ảnh khác.')
    } finally {
      setProcessing(false)
    }
  }

  const submit = async (values: FormValues) => {
    try {
      await onSave({
        name: values.name.trim(),
        target: Number(values.target),
        saved: Number(values.saved || 0),
        deadline: values.deadline || undefined,
        color: values.color,
        image: values.image || undefined,
      })
    } catch (err) {
      setError('root.server', { message: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
    }
  }

  return (
    <BottomSheet
      title={goal ? 'Sửa mục tiêu' : 'Mục tiêu mới'}
      onClose={onClose}
      footer={
        <Button type="submit" form="goal-form" disabled={processing || isSubmitting}>
          {isSubmitting ? 'Đang lưu…' : goal ? 'Lưu thay đổi' : 'Tạo mục tiêu'}
        </Button>
      }
    >
      <form id="goal-form" noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pt-2">
        {errors.root?.server && <Alert>{errors.root.server.message}</Alert>}
        {/* Cover preview doubles as the photo picker. */}
        <GoalCover goal={{ color, image: image || undefined }} className="h-32 rounded-3xl">
          <label className="absolute inset-0 grid cursor-pointer place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              <ImagePlus className="size-4" />
              {processing ? 'Đang xử lý…' : image ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={pickImage} />
          </label>
          {image && (
            <button
              type="button"
              onClick={() => setValue('image', '')}
              aria-label="Bỏ ảnh bìa"
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <X className="size-4" />
            </button>
          )}
        </GoalCover>
        {imageError && <Alert>{imageError}</Alert>}

        <TextField
          label="Tên mục tiêu"
          placeholder="vd: Du lịch Nhật Bản"
          maxLength={40}
          error={errors.name?.message}
          {...register('name', { validate: (v) => v.trim() !== '' || 'Vui lòng nhập tên mục tiêu' })}
        />

        <Controller
          name="target"
          control={control}
          rules={{ validate: (v) => Number(v) > 0 || 'Vui lòng nhập số tiền mục tiêu' }}
          render={({ field, fieldState }) => (
            <MoneyField label="Số tiền cần" ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
          )}
        />

        <Controller
          name="saved"
          control={control}
          render={({ field }) => (
            <MoneyField label="Đã có sẵn (không bắt buộc)" ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
          )}
        />

        <TextField
          label="Hạn hoàn thành (không bắt buộc)"
          type="month"
          min={goal ? undefined : monthKey(todayISO())}
          {...register('deadline')}
        />

        <div className="flex flex-col gap-2">
          <Text as="span" variant="label" tone="muted">
            Màu
          </Text>
          <div role="radiogroup" aria-label="Màu" className="flex gap-3">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={GOAL_ACCENTS[c].label}
                onClick={() => setValue('color', c)}
                className={cn(
                  'grid size-10 place-items-center rounded-full text-white transition',
                  color === c && 'ring-2 ring-gray-900 ring-offset-2',
                )}
                style={{ backgroundColor: GOAL_ACCENTS[c].base }}
              >
                {color === c && <Check className="size-5" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
