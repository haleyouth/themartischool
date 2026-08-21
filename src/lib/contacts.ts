import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClasses, useEnrollments, useStaff, useStudents } from '@/lib/hooks'
import type { Role, StudentDoc, UserDoc } from '@/types/models'

export interface Contact {
  uid: string
  displayName: string
  role: Role
  /** Guardian name for a student, email for staff. */
  subtitle: string
  studentId?: string
}

/**
 * Who a signed in user is allowed to message.
 *
 * The policy mirrors what createConversation enforces server-side, so the
 * directory never offers someone the server would refuse:
 *
 *  - Director and principal reach everybody.
 *  - A teacher reaches all staff, and the families of children they teach.
 *  - A family reaches staff, never another family.
 *
 * A student account is the family account: the guardian logs in as the child.
 * Contacts for a student are therefore labelled with the guardian's name, so
 * a teacher knows they are writing to a parent rather than to a nine year old.
 */
export function useContacts() {
  const { user, role, claims } = useAuth()
  const { data: users, loading: usersLoading } = useStaff()
  const { data: students, loading: studentsLoading } = useStudents()
  const { data: classes } = useClasses()

  // Only a teacher needs the enrollment list, to find their own families.
  const myClassIds = useMemo(() => new Set(claims?.classIds ?? []), [claims?.classIds])
  const { data: enrollments } = useEnrollments(
    role === 'teacher' ? Array.from(myClassIds)[0] : undefined,
  )

  const contacts = useMemo<Contact[]>(() => {
    if (!user || !role) return []

    const staffContacts = (list: UserDoc[]) =>
      list
        .filter((u) => u.role !== 'student' && u.uid !== user.uid && u.status === 'active')
        .map<Contact>((u) => ({
          uid: u.uid,
          displayName: u.displayName ?? '',
          role: u.role,
          subtitle: u.email ?? '',
        }))

    const familyContacts = (list: StudentDoc[]) =>
      list
        .filter((s) => s.enrollmentStatus === 'active' && s.uid)
        .map<Contact>((s) => ({
          uid: s.uid,
          // The family is reached through the child's account, so name the
          // child but make the guardian explicit in the subtitle.
          displayName: `${s.firstName} ${s.lastName}`.trim(),
          role: 'student',
          subtitle: s.guardianName ? `${s.guardianName}` : (s.guardianEmail ?? ''),
          studentId: s.studentId,
        }))

    if (role === 'director' || role === 'principal') {
      return [...staffContacts(users), ...familyContacts(students)]
    }

    if (role === 'teacher') {
      // A teacher reaches only the families of children in their own classes.
      const enrolledStudentIds = new Set(
        enrollments.filter((e) => e.status === 'active').map((e) => e.studentId),
      )
      // Fall back to the denormalised class list when enrollments are still
      // loading, so the directory is not briefly empty.
      const mine = students.filter(
        (s) =>
          enrolledStudentIds.has(s.studentId) ||
          (s.currentClassIds ?? []).some((id) => myClassIds.has(id)),
      )
      return [...staffContacts(users), ...familyContacts(mine)]
    }

    // A family reaches staff only, never another family.
    return staffContacts(users)
  }, [user, role, users, students, enrollments, myClassIds])

  return {
    contacts,
    loading: usersLoading || studentsLoading,
    // Exposed so a caller can label a thread with its class.
    classes,
  }
}

/** Groups a contact list by role, in the order a directory should present it. */
export function groupContacts(contacts: Contact[]) {
  const order: Role[] = ['director', 'principal', 'teacher', 'student']
  return order
    .map((role) => ({
      role,
      people: contacts
        .filter((c) => c.role === role)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .filter((group) => group.people.length > 0)
}
