import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
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

// Built from codepoints so this file never contains the glyphs it screens for.
const DASH = new RegExp('[' + ['2012', '2013', '2014', '2015'].map((c) => String.fromCharCode(parseInt(c, 16))).join('') + ']')

/** Every source file that ships or describes the product. */
function sourceFiles(): string[] {
  const out: string[] = ['firestore.rules', 'storage.rules']
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'lib') continue
        walk(full)
      } else if (/[.](ts|tsx|css|mjs|html)$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  for (const root of ['src', 'functions/src', 'scripts']) {
    if (existsSync(root)) walk(root)
  }
  return out
}

describe('source text', () => {
  it('contains no em dashes or en dashes anywhere', () => {
    const offenders: string[] = []
    for (const file of sourceFiles()) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (DASH.test(line)) offenders.push(file + ':' + (index + 1))
        })
    }
    expect(offenders).toEqual([])
  })
})

describe('user-facing copy', () => {
  it('contains no em dashes or en dashes', () => {
    const offenders = ALL_COPY.filter(([, value]) => DASH.test(value)).map(([key]) => key)
    expect(offenders).toEqual([])
  })

  it('does not use the placeholder dash glyph', () => {
    const emDash = String.fromCharCode(0x2014)
    const offenders = ALL_COPY.filter(([, value]) => value.includes(emDash)).map(([key]) => key)
    expect(offenders).toEqual([])
  })

  it('names the organisation correctly', () => {
    // The logo and the school's own naming use Inhabitants.
    expect((en as Dict).brand).toMatchObject({
      full: 'Maryland Turkish-American Inhabitants',
    })
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
  it('does not display any price in the UI', () => {
    // Prices are deliberately hidden: the school office confirms fees after a
    // place is offered. Guard against a price creeping back onto the page.
    const ui = readFileSync('src/components/sections/RegisterSection.tsx', 'utf8')
    expect(ui).not.toMatch(/plan\.price/)
    expect(ui).not.toMatch(/currency\(/)
  })

  it('tells families the office will confirm fees, in both languages', () => {
    const enNotice = flatten(en as Dict).find(([k]) => k === 'register.feesNotice')?.[1]
    const trNotice = flatten(tr as Dict).find(([k]) => k === 'register.feesNotice')?.[1]
    expect(enNotice).toBeTruthy()
    expect(trNotice).toBeTruthy()
    expect(enNotice).not.toEqual(trNotice)
  })

  it('has exactly one featured plan', () => {
    expect(TUITION_PLANS.filter((plan) => plan.featured)).toHaveLength(1)
  })
})

describe('settings notification toggles', () => {
  const settings = readFileSync('src/pages/app/Settings.tsx', 'utf8')

  it('keeps the knob inside its track', () => {
    // A 44px track with a 2px border leaves 40px inside, so a 20px knob must
    // travel exactly 20px (translate-x-5). An arbitrary rem value previously
    // pushed it past the right edge.
    expect(settings).toMatch(/h-6 w-11 shrink-0 rounded-full border-2/)
    expect(settings).toMatch(/translate-x-5/)
    expect(settings).not.toMatch(/translate-x-\[1\.375rem\]/)
  })

  it('labels each switch for screen readers', () => {
    expect(settings).toMatch(/role="switch"/)
    expect(settings).toMatch(/aria-checked=/)
    expect(settings).toMatch(/aria-label=\{t\(pref\.labelKey\)\}/)
  })
})

describe('registration gate', () => {
  const register = readFileSync('src/components/sections/RegisterSection.tsx', 'utf8')
  const settings = readFileSync('src/pages/app/Settings.tsx', 'utf8')
  const navbar = readFileSync('src/components/public/Navbar.tsx', 'utf8')

  it('replaces the form when registration is closed', () => {
    // A disabled form that still renders would let a family fill in five
    // steps before finding out the intake is shut.
    expect(register).toMatch(/!settings\.registrationOpen/)
    expect(register).toMatch(/register\.closedTitle/)
  })

  it('defaults to open when the setting has never been written', () => {
    const hook = readFileSync('src/lib/useSiteSettings.ts', 'utf8')
    expect(hook).toMatch(/registrationOpen:\s*true/)
  })

  it('shows the toggle to admins only', () => {
    expect(settings).toMatch(/isAdminRole\(auth\.role\) && \(/)
    expect(settings).toMatch(/settings\.registrationTitle/)
  })

  it('explains the closed state in both languages', () => {
    for (const dict of [en, tr]) {
      const flat = Object.fromEntries(flatten(dict as Dict))
      expect(flat['register.closedTitle']).toBeTruthy()
      expect(flat['register.closedBody']).toBeTruthy()
      expect(flat['settings.registrationTitle']).toBeTruthy()
    }
  })

  it('keeps register in the nav but drops the duplicate button', () => {
    expect(navbar).toMatch(/SECTION_IDS\.register, key: 'nav\.register'/)
    // The old call to action button also lived in the header.
    expect(navbar).not.toMatch(/goToSection\(SECTION_IDS\.register\)/)
  })
})
