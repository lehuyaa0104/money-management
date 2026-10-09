import type { ReactNode } from 'react'
import Text from './Text'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}

export default function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Text as="label" variant="label" tone="muted" htmlFor={htmlFor}>
        {label}
      </Text>
      {children}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </div>
  )
}
