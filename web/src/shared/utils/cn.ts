import { twMerge } from 'tailwind-merge'

// Joins class names; later Tailwind classes win over conflicting earlier ones,
// so a `className` prop can override a component's default styles.
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
