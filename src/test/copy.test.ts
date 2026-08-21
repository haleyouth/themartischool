import { describe, expect, it } from 'vitest'
import en from '@/i18n/en.json'
import tr from '@/i18n/tr.json'
import { SCHOOL_INFO, SCHOOL_STATS, TUITION_PLANS } from '@/lib/content'

type Dict = Record<string, unknown>

function flatten(obj: Dict, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value as Dict, `${prefix}${key}.`)
      : ([[`${prefix}${key}`, String(value)]] as [string, string][]),
  )
}

const ALL_COPY = [...flatten(en as Dict), ...flatten(tr as Dict)]

describe('user-facing copy', () => {
  it('contains no em dashes or en dashes', () => {
    const offenders = ALL_COPY.filter(([, value]) => /[—–]/.test(value)).map(([key]) => key)
    expect(offenders).toEqual([])
  })

  it('does not use the placeholder dash glyph', () => {
    const offenders = ALL_COPY.filter(([, value]) => value.includes('—')).map(([key]) => key)
    expect(offenders).toEqual([])
  })

  it('names the organisation correctly', () => {
    // The logo reads "Maryland Turkish American Inhabitants", but the real
    // organisation is the Maryland Turkish-American Community. Guard against
    // the wrong name creeping back in.
    const wrong = ALL_COPY.filter(([, value]) => /Inhabitants/i.test(value)).map(([key]) => key)
    expect(wrong).toEqual([])
    expect((en as Dict).brand).toMatchObject({ full: 'Maryland Turkish-American Community' })
  })
})

describe('organisation details', () => {
  it('uses the real Columbia address and phone from themarti.org', () => {
    expect(SCHOOL_INFO.addressLines.join(' ')).toContain('Columbia, MD 21046')
    expect(SCHOOL_INFO.phone).toBe('(410) 660-0501')
    expect(SCHOOL_INFO.email).toBe('info@themarti.org')
    expect(SCHOOL_INFO.foundedYear).toBe(2003)
  })

  it('does not reference the invented Rockville address', () => {
    expect(JSON.stringify(SCHOOL_INFO)).not.toMatch(/Rockville/i)
  })

  it('publishes the figures the organisation itself reports', () => {
    const byLabel = Object.fromEntries(SCHOOL_STATS.map((s) => [s.labelKey, s.value]))
    expect(byLabel['home.statStudents']).toBe(168)
    expect(byLabel['home.statTeachers']).toBe(25)
  })
})

describe('tuition', () => {
  it('flags its amounts as placeholders in both languages', () => {
    const noticeEn = flatten(en as Dict).find(([k]) => k === 'tuition.placeholderNotice')?.[1]
    const noticeTr = flatten(tr as Dict).find(([k]) => k === 'tuition.placeholderNotice')?.[1]
    expect(noticeEn).toBeTruthy()
    expect(noticeTr).toBeTruthy()
  })

  it('has exactly one featured plan', () => {
    expect(TUITION_PLANS.filter((plan) => plan.featured)).toHaveLength(1)
  })

  it('prices every plan above zero', () => {
    for (const plan of TUITION_PLANS) expect(plan.price).toBeGreaterThan(0)
  })
})
