/**
 * Student-ID <-> Firebase Auth mapping.
 *
 * Firebase Auth is email-based, but students sign in with a school-issued ID
 * like `MRT-2026-0042`. We map that ID onto a deterministic, non-routable
 * "shadow" email so Firebase's own password hashing, throttling and reset
 * machinery keep working. The shadow address is an implementation detail and
 * is never shown to a user; the family's real email lives on the student doc.
 *
 * This module is imported by BOTH the web client and the Cloud Functions so
 * the two can never disagree about how an ID maps to an account.
 */

export const SHADOW_EMAIL_DOMAIN = 'students.themartischool.app'

export const STUDENT_ID_PREFIX = 'MRT'

/** Matches `MRT-2026-0042`. */
export const STUDENT_ID_PATTERN = /^MRT-\d{4}-\d{4}$/

/**
 * Accepts what a human might actually type — lowercase, extra spaces, missing
 * dashes, or a bare sequence number — and returns the canonical form.
 * Returns null when the input cannot be read as a student ID.
 */
export function normalizeStudentId(input: string, fallbackYear?: number): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '')
  if (!cleaned) return null

  // Already canonical, or canonical once dashes are inserted.
  const digitsOnly = cleaned.replace(/[^0-9]/g, '')
  const hasPrefix = cleaned.startsWith(STUDENT_ID_PREFIX)

  if (hasPrefix && digitsOnly.length === 8) {
    const year = digitsOnly.slice(0, 4)
    const seq = digitsOnly.slice(4)
    return `${STUDENT_ID_PREFIX}-${year}-${seq}`
  }

  // A bare sequence number ("42") is resolved against the current school year.
  if (!hasPrefix && digitsOnly.length > 0 && digitsOnly.length <= 4 && fallbackYear) {
    return `${STUDENT_ID_PREFIX}-${fallbackYear}-${digitsOnly.padStart(4, '0')}`
  }

  return null
}

export function isValidStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value)
}

/** `MRT-2026-0042` -> `mrt-2026-0042@students.themartischool.app` */
export function toShadowEmail(studentId: string): string {
  const canonical = studentId.trim().toUpperCase()
  if (!isValidStudentId(canonical)) {
    throw new Error(`Invalid student ID: ${studentId}`)
  }
  return `${canonical.toLowerCase()}@${SHADOW_EMAIL_DOMAIN}`
}

/** Inverse of toShadowEmail. Returns null for any non-shadow address. */
export function fromShadowEmail(email: string): string | null {
  const [local, domain] = email.trim().toLowerCase().split('@')
  if (domain !== SHADOW_EMAIL_DOMAIN) return null
  const candidate = local.toUpperCase()
  return isValidStudentId(candidate) ? candidate : null
}

export function isShadowEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SHADOW_EMAIL_DOMAIN}`)
}

export function formatStudentId(schoolYear: number, sequence: number): string {
  return `${STUDENT_ID_PREFIX}-${schoolYear}-${String(sequence).padStart(4, '0')}`
}
