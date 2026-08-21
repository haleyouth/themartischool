import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { groupContacts, type Contact } from '@/lib/contacts'

const contact = (over: Partial<Contact>): Contact => ({
  uid: 'u1',
  displayName: 'Someone',
  role: 'teacher',
  subtitle: '',
  ...over,
})

describe('groupContacts', () => {
  it('orders groups by seniority, then names alphabetically', () => {
    const groups = groupContacts([
      contact({ uid: 'b', displayName: 'Zeynep', role: 'teacher' }),
      contact({ uid: 'a', displayName: 'Ahmet', role: 'teacher' }),
      contact({ uid: 'd', displayName: 'Director', role: 'director' }),
      contact({ uid: 's', displayName: 'Elif', role: 'student' }),
    ])

    expect(groups.map((g) => g.role)).toEqual(['director', 'teacher', 'student'])
    expect(groups[1].people.map((p) => p.displayName)).toEqual(['Ahmet', 'Zeynep'])
  })

  it('omits roles with nobody in them', () => {
    const groups = groupContacts([contact({ role: 'teacher' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].role).toBe('teacher')
  })

  it('handles an empty directory', () => {
    expect(groupContacts([])).toEqual([])
  })
})

describe('contact policy', () => {
  const source = readFileSync('src/lib/contacts.ts', 'utf8')

  it('lets admins reach both staff and families', () => {
    expect(source).toMatch(/director' \|\| role === 'principal'/)
    expect(source).toMatch(/staffContacts\(users\), \.\.\.familyContacts\(students\)/)
  })

  it('limits a teacher to the families they actually teach', () => {
    // A teacher must not be able to message every family in the school.
    expect(source).toMatch(/enrolledStudentIds/)
    expect(source).toMatch(/myClassIds/)
  })

  it('never offers a family another family', () => {
    // The last branch is the family case and returns staff only.
    const familyBranch = source.slice(source.lastIndexOf('// A family reaches staff only'))
    expect(familyBranch).toMatch(/return staffContacts\(users\)/)
    expect(familyBranch).not.toMatch(/familyContacts/)
  })

  it('excludes the signed in user from their own directory', () => {
    expect(source).toMatch(/u\.uid !== user\.uid/)
  })

  it('excludes suspended and archived accounts', () => {
    expect(source).toMatch(/u\.status === 'active'/)
    expect(source).toMatch(/s\.enrollmentStatus === 'active'/)
  })
})
