/**
 * What the school teaches, and to whom.
 *
 * The weekend school runs Pre-K, Kindergarten and grades 1 to 5 only. The two
 * early years follow a play based curriculum, so they carry a different
 * subject list from the graded years. Everything that offers a grade or a
 * subject reads from here, so the two can never drift apart.
 */

export const GRADE_LEVELS = ['PK', 'K', '1', '2', '3', '4', '5'] as const
export type GradeLevel = (typeof GRADE_LEVELS)[number]

/** Pre-K and Kindergarten are grouped as early years throughout. */
export const EARLY_YEARS: readonly GradeLevel[] = ['PK', 'K']

export const SUBJECTS = [
  'turkish',
  'islamic_studies',
  'quran',
  'activities',
  'physical_education',
  'art',
  'dance',
] as const
export type Subject = (typeof SUBJECTS)[number]

/** Subjects taught in grades 1 to 5. */
export const GRADED_SUBJECTS: readonly Subject[] = [
  'turkish',
  'islamic_studies',
  'quran',
  'activities',
  'physical_education',
]

/**
 * Subjects taught in Pre-K and Kindergarten.
 *
 * Both years share the same list. They are separate year groups with their
 * own classes, but the curriculum they follow is identical.
 */
export const EARLY_YEAR_SUBJECTS: readonly Subject[] = ['art', 'turkish', 'dance']

export function isEarlyYear(grade: string): boolean {
  return (EARLY_YEARS as readonly string[]).includes(grade)
}

/** The subjects a given grade is allowed to be taught. */
export function subjectsForGrade(grade: string): readonly Subject[] {
  return isEarlyYear(grade) ? EARLY_YEAR_SUBJECTS : GRADED_SUBJECTS
}

/**
 * The subjects valid for a set of grades.
 *
 * A class may span several grades, so this returns the union. Mixing an early
 * year with a graded year is allowed but unusual, and the caller should say so.
 */
export function subjectsForGrades(grades: string[]): readonly Subject[] {
  if (!grades.length) return SUBJECTS
  const allowed = new Set<Subject>()
  for (const grade of grades) {
    for (const subject of subjectsForGrade(grade)) allowed.add(subject)
  }
  return SUBJECTS.filter((subject) => allowed.has(subject))
}

/** True when a class mixes early years with graded years. */
export function spansBothStages(grades: string[]): boolean {
  return grades.some(isEarlyYear) && grades.some((g) => !isEarlyYear(g))
}

/** Translation key suffix, so 'islamic_studies' becomes 'IslamicStudies'. */
export function subjectKey(subject: string): string {
  return subject
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** Translation key suffix for a grade, so 'PK' becomes 'PK'. */
export function gradeLabelKey(grade: string): string {
  return `grades.g${grade}`
}

/**
 * Parent facing colour and emoji per subject.
 *
 * The internal class name is written for staff ("Turkish Level 2, Saturday
 * AM"), so the public prospectus dresses each class by its subject instead.
 */
export const SUBJECT_PRESENTATION: Record<
  Subject,
  { emoji: string; accent: 'marti' | 'amber' | 'teal' | 'magenta' | 'grape' }
> = {
  turkish: { emoji: '📚', accent: 'marti' },
  islamic_studies: { emoji: '🕌', accent: 'teal' },
  quran: { emoji: '📖', accent: 'grape' },
  activities: { emoji: '🎲', accent: 'amber' },
  physical_education: { emoji: '⚽', accent: 'magenta' },
  art: { emoji: '🎨', accent: 'magenta' },
  dance: { emoji: '💃', accent: 'grape' },
}

/** Falls back gracefully if a class carries a subject we no longer teach. */
export function presentationFor(subject: string) {
  return (
    SUBJECT_PRESENTATION[subject as Subject] ?? { emoji: '📘', accent: 'marti' as const }
  )
}

/**
 * The youngest age a set of grades admits, e.g. 6 for grades 1 to 5.
 *
 * Deliberately open ended. Families think in ages and the school records
 * grades, so the card says "Ages 6+" rather than inventing an upper bound
 * that would wrongly exclude an older child placed by ability.
 */
const TYPICAL_AGE: Record<string, number> = {
  PK: 4,
  K: 5,
  '1': 6,
  '2': 7,
  '3': 8,
  '4': 9,
  '5': 10,
}

export function minimumAgeForGrades(grades: string[]): number | null {
  const ages = grades.map((g) => TYPICAL_AGE[g]).filter((a): a is number => typeof a === 'number')
  if (!ages.length) return null
  return Math.min(...ages)
}
