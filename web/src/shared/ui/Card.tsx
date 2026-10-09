import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export default function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-3xl bg-white p-5 shadow-sm', className)} {...props} />
}
