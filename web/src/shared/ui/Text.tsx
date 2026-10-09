import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cn } from '@/shared/utils/cn'

type TextElement = 'p' | 'span' | 'strong' | 'h1' | 'h2' | 'h3' | 'label' | 'dt' | 'dd'

export type TextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label'
export type TextTone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'inverse' | 'inverse-muted'
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold'

const VARIANT_CLASS: Record<TextVariant, string> = {
  display: 'text-4xl font-bold tracking-tight',
  title: 'text-3xl font-bold tracking-tight',
  heading: 'text-xl font-bold',
  subheading: 'text-lg font-bold',
  body: 'text-base',
  caption: 'text-sm',
  label: 'text-xs font-bold uppercase tracking-wider',
}

const VARIANT_ELEMENT: Record<TextVariant, TextElement> = {
  display: 'p',
  title: 'h1',
  heading: 'h2',
  subheading: 'h3',
  body: 'p',
  caption: 'p',
  label: 'span',
}

const TONE_CLASS: Record<TextTone, string> = {
  default: 'text-gray-900',
  muted: 'text-gray-400',
  subtle: 'text-gray-600',
  primary: 'text-primary',
  danger: 'text-red-600',
  inverse: 'text-white',
  'inverse-muted': 'text-white/75',
}

const WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

type TextProps<T extends TextElement> = {
  /** HTML element to render; defaults to the one matching `variant`. */
  as?: T
  variant?: TextVariant
  /** Text color; omit to inherit it from the parent. */
  tone?: TextTone
  /** Overrides the variant's font weight. */
  weight?: TextWeight
} & ComponentPropsWithoutRef<T>

export default function Text<T extends TextElement = 'p'>({
  as,
  variant = 'body',
  tone,
  weight,
  className,
  ...props
}: TextProps<T>) {
  const Component: ElementType = as ?? VARIANT_ELEMENT[variant]
  // Props are already checked against `as` by TextProps<T>; TS can't narrow a
  // generic spread onto a dynamic element, so widen it here.
  const rest = props as Record<string, unknown>

  return (
    <Component
      className={cn(VARIANT_CLASS[variant], tone && TONE_CLASS[tone], weight && WEIGHT_CLASS[weight], className)}
      {...rest}
    />
  )
}
