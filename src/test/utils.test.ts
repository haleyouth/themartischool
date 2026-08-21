import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import {
  avatarColor,
  cn,
  currency,
  formatDate,
  fullName,
  initials,
  percent,
  toDate,
  truncate,
} from '@/lib/utils'

describe('cn', () => {
  it('merges conflicting tailwind classes, last one winning', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })
})

describe('toDate', () => {
  it('unwraps a Firestore Timestamp', () => {
    const now = new Date(2026, 5, 1, 12)
    expect(toDate(Timestamp.fromDate(now))?.getTime()).toBe(now.getTime())
  })

  it('passes a Date through', () => {
    const now = new Date()
    expect(toDate(now)).toBe(now)
  })

  it('returns null for a pending serverTimestamp write', () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
  })
})

describe('formatDate', () => {
  it('renders a YYYY-MM-DD key without shifting the day', () => {
    // Parsing '2026-09-05' as UTC would render the 4th in western timezones.
    expect(formatDate('2026-09-05', 'en-US')).toContain('5')
    expect(formatDate('2026-09-05', 'en-US')).toContain('2026')
  })

  it('shows a dash rather than crashing on missing or invalid input', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined)).toBe('-')
    expect(formatDate('not-a-date')).toBe('-')
  })

  it('respects the locale', () => {
    const tr = formatDate('2026-09-05', 'tr-TR', { month: 'long' })
    expect(tr.toLowerCase()).toContain('eylül')
  })
})

describe('percent', () => {
  it('computes a rounded percentage', () => {
    expect(percent(1, 2)).toBe(50)
    expect(percent(2, 3)).toBe(67)
    expect(percent(30, 30)).toBe(100)
  })

  it('returns zero instead of dividing by zero', () => {
    expect(percent(0, 0)).toBe(0)
    expect(percent(5, 0)).toBe(0)
  })
})

describe('name helpers', () => {
  it('builds initials from at most two words', () => {
    expect(initials('Elif Kaya')).toBe('EK')
    expect(initials('Ahmet')).toBe('A')
    expect(initials('Dr. Emre Yıldız')).toBe('DE')
  })

  it('prefers a preferred name when one is set', () => {
    expect(fullName('Mehmet', 'Kaya')).toBe('Mehmet Kaya')
    expect(fullName('Mehmet', 'Kaya', 'Memo')).toBe('Memo Kaya')
    expect(fullName('Mehmet', 'Kaya', null)).toBe('Mehmet Kaya')
  })

  it('picks a stable avatar colour per name', () => {
    expect(avatarColor('Elif Kaya')).toBe(avatarColor('Elif Kaya'))
  })
})

describe('currency', () => {
  it('formats whole dollars', () => {
    expect(currency(120, 'en-US')).toBe('$120')
  })
})

describe('truncate', () => {
  it('leaves short text alone and ellipsises long text', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello world', 8)).toBe('hello w…')
    expect(truncate('hello world', 8)).toHaveLength(8)
  })
})
