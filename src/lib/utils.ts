import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Timestamp } from 'firebase/firestore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Firestore Timestamps arrive as null while a serverTimestamp() write settles. */
export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate()
  return null
}

export function formatDate(
  value: Timestamp | Date | string | null | undefined,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!value) return '-'
  const date =
    typeof value === 'string'
      ? new Date(value.includes('T') ? value : `${value}T00:00:00`)
      : toDate(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatDateTime(value: Timestamp | Date | null | undefined, locale = 'en-US') {
  return formatDate(value, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(value: Timestamp | Date | null | undefined, locale = 'en'): string {
  const date = toDate(value)
  if (!date) return '-'

  const diffMs = date.getTime() - Date.now()
  const absSec = Math.abs(diffMs) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, seconds] of units) {
    if (absSec >= seconds) {
      return rtf.format(Math.round(diffMs / 1000 / seconds), unit)
    }
  }
  return rtf.format(Math.round(diffMs / 1000), 'second')
}

/** '10:00' -> '10:00 AM' */
export function formatTime(hhmm: string, locale = 'en-US'): string {
  const [h, m] = hhmm.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function fullName(first: string, last: string, preferred?: string | null): string {
  return `${preferred || first} ${last}`.trim()
}

/** Deterministic pastel avatar colour derived from a name. */
export function avatarColor(seed: string): string {
  const palette = [
    'bg-marti-100 text-marti-700',
    'bg-amber-100 text-amber-700',
    'bg-magenta-100 text-magenta-700',
    'bg-teal-100 text-teal-700',
    'bg-grape-100 text-grape-700',
    'bg-amber-100 text-amber-700',
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

export function currency(amount: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function percent(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
