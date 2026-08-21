import { describe, expect, it } from 'vitest'
import en from '@/i18n/en.json'
import tr from '@/i18n/tr.json'

type Dict = Record<string, unknown>

function flatten(obj: Dict, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value as Dict, `${prefix}${key}.`)
      : ([[`${prefix}${key}`, String(value)]] as [string, string][]),
  )
}

const EN = Object.fromEntries(flatten(en as Dict))
const TR = Object.fromEntries(flatten(tr as Dict))

/** Values that are legitimately identical in both languages. */
const ALLOWED_IDENTICAL = new Set([
  'brand.short', // MARTI is a proper noun
  'contact.emailValue', // an address
  'auth.studentIdPlaceholder', // an ID format
  'auth.identifierPlaceholder', // an ID format
  'brand.full', // the organisation's official English name, kept as-is
  'settings.languageEn', // language names are shown in their own language
  'settings.languageTr',
])

describe('i18n dictionaries', () => {
  it('define exactly the same set of keys', () => {
    expect(Object.keys(TR).sort()).toEqual(Object.keys(EN).sort())
  })

  it('has a non-trivial number of keys', () => {
    expect(Object.keys(EN).length).toBeGreaterThan(500)
  })

  it('never leaves a value empty', () => {
    for (const [key, value] of Object.entries(EN)) expect(value.trim(), `en.${key}`).not.toBe('')
    for (const [key, value] of Object.entries(TR)) expect(value.trim(), `tr.${key}`).not.toBe('')
  })

  it('uses the same interpolation placeholders in both languages', () => {
    for (const key of Object.keys(EN)) {
      const placeholders = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
      expect(placeholders(TR[key]), `placeholders differ for "${key}"`).toEqual(
        placeholders(EN[key]),
      )
    }
  })

  it('actually translates every string that should be translated', () => {
    const untranslated = Object.keys(EN).filter(
      (key) => !ALLOWED_IDENTICAL.has(key) && EN[key] === TR[key],
    )
    expect(untranslated).toEqual([])
  })

  it('uses Turkish characters, confirming the TR file is genuinely Turkish', () => {
    const turkishText = Object.values(TR).join(' ')
    expect(/[çğıİöşüÇĞÖŞÜ]/.test(turkishText)).toBe(true)
  })

  it('covers the key groups every screen depends on', () => {
    for (const group of [
      'nav',
      'common',
      'home',
      'about',
      'programs',
      'tuition',
      'calendar',
      'contact',
      'register',
      'auth',
      'dash',
      'reg',
      'students',
      'classes',
      'attendance',
      'reports',
      'messages',
      'settings',
      'staff',
      'audit',
      'footer',
    ]) {
      expect(Object.keys(EN).some((key) => key.startsWith(`${group}.`)), group).toBe(true)
    }
  })

  it('provides a label for every attendance status and role used in the UI', () => {
    for (const status of ['present', 'absent', 'late', 'excused']) {
      expect(EN[`attendance.${status}`], status).toBeTruthy()
      expect(TR[`attendance.${status}`], status).toBeTruthy()
    }
    for (const role of ['Director', 'Principal', 'Teacher', 'Student']) {
      expect(EN[`staff.role${role}`], role).toBeTruthy()
      expect(TR[`staff.role${role}`], role).toBeTruthy()
    }
  })
})
