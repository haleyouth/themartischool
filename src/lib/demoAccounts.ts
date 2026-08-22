import type { Role } from '@/types/models'

/**
 * Demo accounts wired to the one-click buttons on the login page.
 *
 * These are REAL Firebase Auth users created by `scripts/seed.ts`, not mocks.
 * Signing in as one exercises the same rules and claims as a real account.
 * Because the credentials are public by design, the seeded data is fictional
 * and these accounts must never be given real student records.
 */
export interface DemoAccount {
  role: Role
  /** Email for staff; student ID for the student account. */
  identifier: string
  password: string
  displayName: string
}

export const DEMO_PASSWORD = 'MartiDemo2026!'

export const DEMO_ACCOUNTS = {
  director: {
    role: 'director',
    identifier: 'director@themartischool.org',
    password: DEMO_PASSWORD,
    displayName: 'Fevzi Sarac',
  },
  principal: {
    role: 'principal',
    identifier: 'principal@themartischool.org',
    password: DEMO_PASSWORD,
    displayName: 'Fatma Şahin',
  },
  teacher: {
    role: 'teacher',
    identifier: 'teacher@themartischool.org',
    password: DEMO_PASSWORD,
    displayName: 'Ahmet Demir',
  },
  student: {
    role: 'student',
    identifier: 'MRT-2026-0001',
    password: DEMO_PASSWORD,
    displayName: 'Elif Kaya',
  },
} as const satisfies Record<string, DemoAccount>

export type DemoAccountKey = keyof typeof DEMO_ACCOUNTS
