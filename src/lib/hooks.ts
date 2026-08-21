import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  AttendanceEntryDoc,
  AttendanceSessionDoc,
  ClassDoc,
  ConversationDoc,
  EnrollmentDoc,
  NotificationDoc,
  PerformanceReportDoc,
  RegistrationDoc,
  StudentDoc,
  UserDoc,
} from '@/types/models'

interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

/**
 * Live Firestore collection subscription.
 *
 * `constraints` is rebuilt on every render by callers, so it is intentionally
 * NOT in the dependency array — `depsKey` is the stable signal for when the
 * query genuinely changed. Passing the array directly would tear down and
 * recreate the listener on every render.
 */
function useCollection<T>(
  path: string,
  constraints: QueryConstraint[],
  depsKey: string,
  enabled = true,
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: enabled,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      setState({ data: [], loading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, loading: true }))

    const unsubscribe = onSnapshot(
      query(collection(db, path), ...constraints),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as T),
          id: docSnap.id,
        }))
        setState({ data, loading: false, error: null })
      },
      (error) => {
        console.error(`[useCollection] ${path}`, error)
        setState({ data: [], loading: false, error })
      },
    )

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, depsKey, enabled])

  return state
}

export function useRegistrations(status?: string) {
  const constraints = status
    ? [where('status', '==', status), orderBy('submittedAt', 'desc'), fbLimit(200)]
    : [orderBy('submittedAt', 'desc'), fbLimit(200)]
  return useCollection<RegistrationDoc>('registrations', constraints, `reg-${status ?? 'all'}`)
}

export function useStudents(enabled = true) {
  return useCollection<StudentDoc>(
    'students',
    [orderBy('lastName', 'asc'), fbLimit(500)],
    'students',
    enabled,
  )
}

export function useClasses() {
  return useCollection<ClassDoc>('classes', [orderBy('name', 'asc'), fbLimit(100)], 'classes')
}

/** Classes the signed-in teacher is assigned to. */
export function useMyClasses() {
  const { claims, role } = useAuth()
  const all = useClasses()

  return useMemo(() => {
    if (role !== 'teacher') return all
    const mine = new Set(claims?.classIds ?? [])
    return { ...all, data: all.data.filter((c) => mine.has(c.id)) }
  }, [all, claims?.classIds, role])
}

export function useEnrollments(classId?: string, studentId?: string) {
  const constraints: QueryConstraint[] = []
  if (classId) constraints.push(where('classId', '==', classId))
  // Rules require students to pin studentId on their own queries.
  if (studentId) constraints.push(where('studentId', '==', studentId))
  constraints.push(fbLimit(300))

  return useCollection<EnrollmentDoc>(
    'enrollments',
    constraints,
    `enr-${classId ?? ''}-${studentId ?? ''}`,
    Boolean(classId || studentId),
  )
}

export function useAttendanceSessions(classId?: string) {
  const constraints: QueryConstraint[] = []
  if (classId) constraints.push(where('classId', '==', classId))
  constraints.push(orderBy('sessionDate', 'desc'), fbLimit(60))

  return useCollection<AttendanceSessionDoc>(
    'attendance',
    constraints,
    `att-${classId ?? 'all'}`,
    Boolean(classId),
  )
}

export function useAttendanceHistory(studentId?: string) {
  return useCollection<AttendanceEntryDoc>(
    'attendanceEntries',
    [where('studentId', '==', studentId ?? ''), orderBy('sessionDate', 'desc'), fbLimit(100)],
    `hist-${studentId ?? ''}`,
    Boolean(studentId),
  )
}

/** Reports for staff. Students must use usePublishedReports instead. */
export function useReports(teacherId?: string, studentId?: string) {
  const constraints: QueryConstraint[] = []
  if (teacherId) constraints.push(where('teacherId', '==', teacherId))
  if (studentId) constraints.push(where('studentId', '==', studentId))
  constraints.push(fbLimit(200))

  return useCollection<PerformanceReportDoc>(
    'performanceReports',
    constraints,
    `rep-${teacherId ?? ''}-${studentId ?? ''}`,
  )
}

/**
 * A student's own reports. The uid + status filters are mandated by the
 * security rules, not merely a convenience — drafts must never be readable.
 */
export function usePublishedReports(uid?: string) {
  return useCollection<PerformanceReportDoc>(
    'performanceReports',
    [
      where('uid', '==', uid ?? ''),
      where('status', '==', 'published'),
      orderBy('periodEnd', 'desc'),
      fbLimit(50),
    ],
    `pubrep-${uid ?? ''}`,
    Boolean(uid),
  )
}

export function useNotifications(uid?: string, max = 30) {
  return useCollection<NotificationDoc>(
    'notifications',
    [where('userId', '==', uid ?? ''), orderBy('createdAt', 'desc'), fbLimit(max)],
    `notif-${uid ?? ''}-${max}`,
    Boolean(uid),
  )
}

export function useConversations(uid?: string) {
  return useCollection<ConversationDoc>(
    'conversations',
    [
      where('participantIds', 'array-contains', uid ?? ''),
      orderBy('lastMessageAt', 'desc'),
      fbLimit(50),
    ],
    `conv-${uid ?? ''}`,
    Boolean(uid),
  )
}

export function useStaff() {
  const { role } = useAuth()
  return useCollection<UserDoc>(
    'users',
    [fbLimit(200)],
    'staff',
    role === 'director' || role === 'principal',
  )
}
