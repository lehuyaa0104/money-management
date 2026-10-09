export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const PASSWORD_MIN = 8
export const FULL_NAME_MAX = 50

export function validateUsername(username: string): string | null {
  if (!username) return 'Vui lòng nhập tên đăng nhập'
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Tên đăng nhập dài từ ${USERNAME_MIN} đến ${USERNAME_MAX} ký tự`
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Chỉ dùng chữ không dấu, số và dấu gạch dưới'
  }
  return null
}

export function validateFullName(fullName: string): string | null {
  if (!fullName) return 'Vui lòng nhập họ và tên'
  if (fullName.length > FULL_NAME_MAX) return `Họ và tên tối đa ${FULL_NAME_MAX} ký tự`
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu'
  if (password.length < PASSWORD_MIN) return `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự`
  return null
}
