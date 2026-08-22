import { describe, expect, it } from 'vitest'
import {
  EARLY_YEARS,
  EARLY_YEAR_SUBJECTS,
  GRADED_SUBJECTS,
  GRADE_LEVELS,
  isEarlyYear,
  spansBothStages,
  subjectKey,
  subjectsForGrade,
  subjectsForGrades,
} from '@/lib/curriculum'

describe('grade levels', () => {
  it('covers Pre-K, Kindergarten and grades 1 to 5 only', () => {
    expect([...GRADE_LEVELS]).toEqual(['PK', 'K', '1', '2', '3', '4', '5'])
  })

  it('does not offer grades the school does not run', () => {
    // The weekend school stops at grade 5, so anything beyond is a mistake.
    for (const absent of ['6', '7', '8', '9', '10', '11', '12']) {
      expect(GRADE_LEVELS as readonly string[]).not.toContain(absent)
    }
  })

  it('treats Pre-K and Kindergarten as the early years', () => {
    expect(isEarlyYear('PK')).toBe(true)
    expect(isEarlyYear('K')).toBe(true)
    expect(isEarlyYear('1')).toBe(false)
    expect(isEarlyYear('5')).toBe(false)
    expect([...EARLY_YEARS]).toEqual(['PK', 'K'])
  })
})

describe('subjects by grade', () => {
  it('teaches the five graded subjects in grades 1 to 5', () => {
    expect([...GRADED_SUBJECTS]).toEqual([
      'turkish',
      'islamic_studies',
      'quran',
      'activities',
      'physical_education',
    ])
    for (const grade of ['1', '2', '3', '4', '5']) {
      expect(subjectsForGrade(grade)).toEqual(GRADED_SUBJECTS)
    }
  })

  it('teaches a play based list in the early years', () => {
    expect([...EARLY_YEAR_SUBJECTS]).toEqual(['art', 'turkish', 'dance', 'activities'])
    expect(subjectsForGrade('PK')).toEqual(EARLY_YEAR_SUBJECTS)
    expect(subjectsForGrade('K')).toEqual(EARLY_YEAR_SUBJECTS)
  })

  it('keeps Islamic Studies out of the early years', () => {
    // The whole point of splitting the lists: a Pre-K class must not be able
    // to select a subject meant for the graded years.
    expect(subjectsForGrade('PK')).not.toContain('islamic_studies')
    expect(subjectsForGrade('K')).not.toContain('physical_education')
  })

  it('keeps early year subjects out of the graded years', () => {
    expect(subjectsForGrade('3')).not.toContain('art')
    expect(subjectsForGrade('3')).not.toContain('dance')
  })

  it('shares Activities across both stages', () => {
    // The only subject taught to every year group.
    expect(subjectsForGrade('PK')).toContain('activities')
    expect(subjectsForGrade('K')).toContain('activities')
    expect(subjectsForGrade('4')).toContain('activities')
  })

  it('unions the lists when a class spans several grades', () => {
    const mixed = subjectsForGrades(['K', '3'])
    expect(mixed).toContain('art')
    expect(mixed).toContain('islamic_studies')
  })

  it('offers only the graded list for a purely graded class', () => {
    expect(subjectsForGrades(['2', '3'])).toEqual(GRADED_SUBJECTS)
  })

  it('flags a class that mixes the two stages', () => {
    expect(spansBothStages(['K', '3'])).toBe(true)
    expect(spansBothStages(['1', '2'])).toBe(false)
    expect(spansBothStages(['PK', 'K'])).toBe(false)
  })

  it('falls back to every subject when no grade is chosen yet', () => {
    // An empty picker should not present an empty subject list.
    expect(subjectsForGrades([]).length).toBeGreaterThan(0)
  })
})

describe('subjectKey', () => {
  it('builds the translation key suffix', () => {
    expect(subjectKey('turkish')).toBe('Turkish')
    expect(subjectKey('islamic_studies')).toBe('IslamicStudies')
    expect(subjectKey('physical_education')).toBe('PhysicalEducation')
  })
})
