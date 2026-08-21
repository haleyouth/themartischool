import { describe, expect, it } from 'vitest'
import {
  SHADOW_EMAIL_DOMAIN,
  formatStudentId,
  fromShadowEmail,
  isShadowEmail,
  isValidStudentId,
  normalizeStudentId,
  toShadowEmail,
} from '@/lib/studentId'

describe('formatStudentId', () => {
  it('zero-pads the sequence to four digits', () => {
    expect(formatStudentId(2026, 1)).toBe('MRT-2026-0001')
    expect(formatStudentId(2026, 42)).toBe('MRT-2026-0042')
    expect(formatStudentId(2026, 9999)).toBe('MRT-2026-9999')
  })
})

describe('isValidStudentId', () => {
  it('accepts the canonical form', () => {
    expect(isValidStudentId('MRT-2026-0042')).toBe(true)
  })

  it('rejects malformed IDs', () => {
    for (const bad of [
      'mrt-2026-0042', // lowercase is not canonical
      'MRT-2026-42', // sequence too short
      'MRT-26-0042', // year too short
      'ABC-2026-0042', // wrong prefix
      'MRT20260042', // missing dashes
      '',
      'MRT-2026-0042-X',
    ]) {
      expect(isValidStudentId(bad), bad).toBe(false)
    }
  })
})

describe('normalizeStudentId', () => {
  it('canonicalises what a human would plausibly type', () => {
    expect(normalizeStudentId('MRT-2026-0042')).toBe('MRT-2026-0042')
    expect(normalizeStudentId('mrt-2026-0042')).toBe('MRT-2026-0042')
    expect(normalizeStudentId('  MRT-2026-0042  ')).toBe('MRT-2026-0042')
    expect(normalizeStudentId('MRT 2026 0042')).toBe('MRT-2026-0042')
    expect(normalizeStudentId('MRT20260042')).toBe('MRT-2026-0042')
  })

  it('expands a bare sequence number against the given school year', () => {
    expect(normalizeStudentId('42', 2026)).toBe('MRT-2026-0042')
    expect(normalizeStudentId('7', 2026)).toBe('MRT-2026-0007')
  })

  it('returns null when there is no fallback year for a bare number', () => {
    expect(normalizeStudentId('42')).toBeNull()
  })

  it('returns null for input that is not a student ID', () => {
    expect(normalizeStudentId('')).toBeNull()
    expect(normalizeStudentId('   ')).toBeNull()
    expect(normalizeStudentId('hello')).toBeNull()
    expect(normalizeStudentId('teacher@themartischool.org')).toBeNull()
  })
})

describe('shadow email mapping', () => {
  it('maps an ID onto a deterministic lowercase address', () => {
    expect(toShadowEmail('MRT-2026-0042')).toBe(`mrt-2026-0042@${SHADOW_EMAIL_DOMAIN}`)
  })

  it('is stable, the same ID always yields the same address', () => {
    expect(toShadowEmail('MRT-2026-0001')).toBe(toShadowEmail('mrt-2026-0001'.toUpperCase()))
  })

  it('round-trips back to the canonical ID', () => {
    const id = 'MRT-2026-0123'
    expect(fromShadowEmail(toShadowEmail(id))).toBe(id)
  })

  it('refuses to build an address from an invalid ID', () => {
    expect(() => toShadowEmail('not-an-id')).toThrow()
    expect(() => toShadowEmail('MRT-2026-42')).toThrow()
  })

  it('does not treat a real email as a shadow address', () => {
    expect(fromShadowEmail('teacher@themartischool.org')).toBeNull()
    expect(isShadowEmail('teacher@themartischool.org')).toBe(false)
    expect(isShadowEmail(`mrt-2026-0001@${SHADOW_EMAIL_DOMAIN}`)).toBe(true)
  })

  it('never collides across different IDs', () => {
    const addresses = new Set(
      Array.from({ length: 500 }, (_, i) => toShadowEmail(formatStudentId(2026, i + 1))),
    )
    expect(addresses.size).toBe(500)
  })
})
