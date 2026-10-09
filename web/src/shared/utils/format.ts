const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

/** Short amounts for tight spaces: 950 ₫, 250k, 8,4 tr, 1,3 tỷ. */
export function formatCompactCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (abs >= 1e9) return `${sign}${decimalFormatter.format(abs / 1e9)} tỷ`
  if (abs >= 1e6) return `${sign}${decimalFormatter.format(abs / 1e6)} tr`
  if (abs >= 1e3) return `${sign}${decimalFormatter.format(abs / 1e3)}k`
  return formatCurrency(amount)
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** "08/10" */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

/** "T2" … "CN" */
export function formatWeekday(isoDate: string): string {
  return WEEKDAYS[parseISODate(isoDate).getDay()]
}

export function formatTime(isoTimestamp: string): string {
  return timeFormatter.format(new Date(isoTimestamp))
}

/** Local-time YYYY-MM-DD for a Date (not UTC, so late-evening entries keep their day). */
export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(isoDate: string, days: number): string {
  const date = parseISODate(isoDate)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Whole days from one YYYY-MM-DD to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000)
}

/** Day heading for transaction lists: "Hôm nay", "Hôm qua", "T4, 30/09", or "30/09/2025" for other years. */
export function formatDayLabel(isoDate: string, withDate = false): string {
  const today = todayISO()
  const suffix = withDate ? `, ${formatDayMonth(isoDate)}` : ''
  if (isoDate === today) return `Hôm nay${suffix}`
  if (isoDate === addDays(today, -1)) return `Hôm qua${suffix}`
  if (isoDate.slice(0, 4) !== today.slice(0, 4)) return formatDate(isoDate)
  return `${formatWeekday(isoDate)}, ${formatDayMonth(isoDate)}`
}

/** "2026-10" → "Tháng 10/2026" */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-')
  return `Tháng ${Number(monthNumber)}/${year}`
}

const FULL_WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

/** "Thứ Tư, 07/10/2026" */
export function formatFullDate(isoDate: string): string {
  return `${FULL_WEEKDAYS[parseISODate(isoDate).getDay()]}, ${formatDate(isoDate)}`
}

/** "2026-10" ± n months */
export function addMonths(month: string, n: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Current local time as "HH:mm" (the value format of <input type="time">). */
export function nowTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** Local "YYYY-MM-DD" + "HH:mm" → ISO timestamp. */
export function toTimestamp(isoDate: string, time: string): string {
  return new Date(`${isoDate}T${time || '00:00'}`).toISOString()
}

const groupedNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** 1500000 → "1.500.000" (no currency sign). */
export function formatNumber(value: number): string {
  return groupedNumber.format(value)
}
