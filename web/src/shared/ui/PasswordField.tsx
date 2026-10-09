import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import TextField from './TextField'

interface PasswordFieldProps extends Omit<ComponentProps<typeof TextField>, 'type' | 'icon' | 'trailing'> {
  toggleable?: boolean
}

export default function PasswordField({ toggleable = true, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const ToggleIcon = visible ? EyeOff : Eye

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      className="grid size-10 place-items-center rounded-xl text-gray-400 active:bg-gray-100"
    >
      <ToggleIcon className="size-5" />
    </button>
  )

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      icon={Lock}
      trailing={toggleable ? toggle : undefined}
    />
  )
}
