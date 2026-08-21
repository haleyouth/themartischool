import { describe, expect, it } from 'vitest'
import {
  currentSchoolYear,
  formatSchoolYear,
  fromDateKey,
  isSaturday,
  mostRecentSaturday,
  nextSaturday,
  saturdaysBetween,
  termForDate,
  toDateKey,
} from '@/lib/schoolYear'

describe('currentSchoolYear', () => {
  it('treats July onwards as the start of the coming academic year', () => {
    expect(currentSchoolYear(new Date(2026, 6, 1))).toBe(2026) // July
    expect(currentSchoolYear(new Date(2026, 8, 15))).toBe(2026) // September
    expect(currentSchoolYear(new Date(2026, 11, 31))).toBe(2026) // December
  })

  it('treats January to June as still belonging to the prior autumn', () => {
    expect(currentSchoolYear(new Date(2027, 0, 5))).toBe(2026) // January
    expect(currentSchoolYear(new Date(2027, 5, 30))).toBe(2026) // June
  })

  it('formats as a spanning label', () => {
    expect(formatSchoolYear(2026)).toBe('2026–2027')
  })
})

describe('date keys', () => {
  it('formats in local time, not UTC', () => {
    // A late-evening date must not roll into the next day, which is what
    // toISOString() would do for western timezones.
    expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 11, 25, 0, 1))).toBe('2026-12-25')
  })

  it('round-trips', () => {
    const key = '2026-09-05'
    expect(toDateKey(fromDateKey(key))).toBe(key)
  })
})

describe('Saturday helpers', () => {
  it('identifies Saturdays', () => {
    expect(isSaturday(fromDateKey('2026-09-05'))).toBe(true) // a Saturday
    expect(isSaturday(fromDateKey('2026-09-06'))).toBe(false) // Sunday
    expect(isSaturday(fromDateKey('2026-09-04'))).toBe(false) // Friday
  })

  it('lists every Saturday in a range', () => {
    const dates = saturdaysBetween(fromDateKey('2026-09-01'), fromDateKey('2026-09-30'))
    expect(dates).toEqual(['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26'])
  })

  it('includes a start date that is itself a Saturday', () => {
    const dates = saturdaysBetween(fromDateKey('2026-09-05'), fromDateKey('2026-09-12'))
    expect(dates).toEqual(['2026-09-05', '2026-09-12'])
  })

  it('omits skipped holiday dates', () => {
    const dates = saturdaysBetween(fromDateKey('2026-09-01'), fromDateKey('2026-09-30'), [
      '2026-09-12',
    ])
    expect(dates).toEqual(['2026-09-05', '2026-09-19', '2026-09-26'])
  })

  it('returns nothing when the range contains no Saturday', () => {
    expect(saturdaysBetween(fromDateKey('2026-09-07'), fromDateKey('2026-09-10'))).toEqual([])
  })

  it('finds the surrounding Saturdays', () => {
    // Wednesday 2026-09-09 sits between the 5th and the 12th.
    expect(mostRecentSaturday(fromDateKey('2026-09-09'))).toBe('2026-09-05')
    expect(nextSaturday(fromDateKey('2026-09-09'))).toBe('2026-09-12')
  })

  it('treats a Saturday as its own most recent Saturday, and looks ahead for the next', () => {
    expect(mostRecentSaturday(fromDateKey('2026-09-05'))).toBe('2026-09-05')
    expect(nextSaturday(fromDateKey('2026-09-05'))).toBe('2026-09-12')
  })

  it('always returns a real Saturday', () => {
    for (const day of ['2026-03-02', '2026-07-19', '2026-11-26', '2026-12-31']) {
      expect(isSaturday(fromDateKey(mostRecentSaturday(fromDateKey(day))))).toBe(true)
      expect(isSaturday(fromDateKey(nextSaturday(fromDateKey(day))))).toBe(true)
    }
  })
})

describe('termForDate', () => {
  it('splits the year into fall and spring', () => {
    expect(termForDate('2026-09-05')).toBe('fall')
    expect(termForDate('2026-12-20')).toBe('fall')
    expect(termForDate('2027-01-10')).toBe('spring')
    expect(termForDate('2027-05-30')).toBe('spring')
  })
})
