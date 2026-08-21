/**
 * School-year and Saturday-session date helpers.
 *
 * The academic year runs autumn -> spring, so it is labelled by the year in
 * which it starts: anything from July onwards belongs to the coming year.
 */

/** ISO weekday for Saturday, per date-fns/JS getDay() where Sunday = 0. */
export const SATURDAY = 6

export function currentSchoolYear(now: Date = new Date()): number {
  const year = now.getFullYear()
  // July (month index 6) is the cutover: earlier months still belong to the
  // academic year that began the previous autumn.
  return now.getMonth() >= 6 ? year : year - 1
}

export function formatSchoolYear(schoolYear: number): string {
  return `${schoolYear}–${schoolYear + 1}`
}

export function isSaturday(date: Date): boolean {
  return date.getDay() === SATURDAY
}

/** 'YYYY-MM-DD' in local time — avoids the UTC shift that toISOString() causes. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Every Saturday between two dates inclusive, minus any dates to skip. */
export function saturdaysBetween(start: Date, end: Date, skip: string[] = []): string[] {
  const skipSet = new Set(skip)
  const dates: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  // Advance to the first Saturday on or after the start date.
  while (cursor.getDay() !== SATURDAY) {
    cursor.setDate(cursor.getDate() + 1)
  }

  while (cursor <= end) {
    const key = toDateKey(cursor)
    if (!skipSet.has(key)) dates.push(key)
    cursor.setDate(cursor.getDate() + 7)
  }

  return dates
}

/** The most recent Saturday on or before the given date. */
export function mostRecentSaturday(from: Date = new Date()): string {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (cursor.getDay() !== SATURDAY) {
    cursor.setDate(cursor.getDate() - 1)
  }
  return toDateKey(cursor)
}

export function nextSaturday(from: Date = new Date()): string {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  do {
    cursor.setDate(cursor.getDate() + 1)
  } while (cursor.getDay() !== SATURDAY)
  return toDateKey(cursor)
}

export function termForDate(dateKey: string): 'fall' | 'spring' {
  const month = fromDateKey(dateKey).getMonth()
  return month >= 6 ? 'fall' : 'spring'
}
