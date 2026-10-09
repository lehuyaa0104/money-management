import { formatTime } from '@/shared/utils/format'
import type { Transaction } from './types'

const HEADERS = ['Ngày', 'Giờ', 'Loại', 'Danh mục', 'Số tiền (VND)', 'Ghi chú']

function cell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  // Text starting with = + - @ would run as a spreadsheet formula; prefix it.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    .map((t) =>
      [
        t.date,
        t.createdAt ? formatTime(t.createdAt) : '',
        t.type === 'income' ? 'Thu' : 'Chi',
        t.category,
        t.type === 'income' ? t.amount : -t.amount,
        t.note,
      ]
        .map(cell)
        .join(','),
    )
  return [HEADERS.join(','), ...rows].join('\r\n')
}

/** Downloads the transactions as a CSV that Excel opens with Vietnamese intact (UTF-8 BOM). */
export function downloadTransactionsCsv(transactions: Transaction[], today: string): void {
  const blob = new Blob(['﻿', transactionsToCsv(transactions)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `money-management-${today}.csv`
  link.click()
  // Revoking right away can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
