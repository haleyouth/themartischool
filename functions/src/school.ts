import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { notify, requireAdmin, requireAuth, writeAudit } from './shared'

/* ── Enrollment ───────────────────────────────────────────── */

export const enrollStudent = onCall<{ studentId: string; classId: string }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)
    const { studentId, classId } = request.data
    const db = getFirestore()

    const [studentSnap, classSnap] = await Promise.all([
      db.doc(`students/${studentId}`).get(),
      db.doc(`classes/${classId}`).get(),
    ])
    if (!studentSnap.exists) throw new HttpsError('not-found', 'Student not found.')
    if (!classSnap.exists) throw new HttpsError('not-found', 'Class not found.')

    const cls = classSnap.data()!
    if ((cls.enrolledCount ?? 0) >= (cls.capacity ?? 0)) {
      throw new HttpsError('failed-precondition', 'That class is full.')
    }

    const enrollmentId = `${studentId}_${classId}`
    const enrollmentRef = db.doc(`enrollments/${enrollmentId}`)

    // The composite id makes re-enrolling idempotent rather than duplicating.
    const existing = await enrollmentRef.get()
    if (existing.exists && existing.data()!.status === 'active') {
      return { enrollmentId }
    }

    const batch = db.batch()
    batch.set(enrollmentRef, {
      id: enrollmentId,
      studentId,
      classId,
      uid: studentSnap.data()!.uid,
      schoolYear: cls.schoolYear ?? null,
      status: 'active',
      enrolledAt: FieldValue.serverTimestamp(),
      enrolledBy: caller.uid,
      droppedAt: null,
    })
    batch.update(db.doc(`classes/${classId}`), {
      enrolledCount: FieldValue.increment(1),
      studentIds: FieldValue.arrayUnion(studentId),
      updatedAt: FieldValue.serverTimestamp(),
    })
    batch.update(db.doc(`students/${studentId}`), {
      currentClassIds: FieldValue.arrayUnion(classId),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await batch.commit()

    await notify({
      userId: studentSnap.data()!.uid,
      type: 'class_assigned',
      title: 'Added to a class',
      body: `You have been enrolled in ${cls.name}.`,
      link: '/app/classes',
      entityType: 'class',
      entityId: classId,
    })

    return { enrollmentId }
  },
)

export const unenrollStudent = onCall<{ studentId: string; classId: string }>(
  { region: 'us-central1' },
  async (request) => {
    requireAdmin(request)
    const { studentId, classId } = request.data
    const db = getFirestore()
    const enrollmentRef = db.doc(`enrollments/${studentId}_${classId}`)

    const snap = await enrollmentRef.get()
    if (!snap.exists || snap.data()!.status !== 'active') {
      throw new HttpsError('failed-precondition', 'No active enrollment to remove.')
    }

    const batch = db.batch()
    batch.update(enrollmentRef, { status: 'dropped', droppedAt: FieldValue.serverTimestamp() })
    batch.update(db.doc(`classes/${classId}`), {
      enrolledCount: FieldValue.increment(-1),
      studentIds: FieldValue.arrayRemove(studentId),
    })
    batch.update(db.doc(`students/${studentId}`), {
      currentClassIds: FieldValue.arrayRemove(classId),
    })
    await batch.commit()

    return { ok: true as const }
  },
)

/** Keeps a teacher's classIds claim in step with their assignments. */
export const assignTeacherToClass = onCall<{
  classId: string
  teacherId: string
  isPrimary?: boolean
}>({ region: 'us-central1' }, async (request) => {
  const caller = requireAdmin(request)
  const { classId, teacherId, isPrimary } = request.data
  const db = getFirestore()

  const userSnap = await db.doc(`users/${teacherId}`).get()
  if (!userSnap.exists) throw new HttpsError('not-found', 'Teacher not found.')

  await db.doc(`classes/${classId}`).update({
    teacherIds: FieldValue.arrayUnion(teacherId),
    ...(isPrimary ? { primaryTeacherId: teacherId } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Rebuild the claim from source so it can never drift from the class docs.
  const taught = await db.collection('classes').where('teacherIds', 'array-contains', teacherId).get()
  const classIds = taught.docs.map((doc) => doc.id)

  const user = userSnap.data()!
  const nextVersion = (user.claimsVersion ?? 0) + 1

  await getAuth().setCustomUserClaims(teacherId, {
    role: user.role,
    active: user.status !== 'suspended',
    v: nextVersion,
    classIds,
  })
  await db.doc(`users/${teacherId}`).update({
    claimsVersion: nextVersion,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'class.assign_teacher',
    targetType: 'class',
    targetId: classId,
    after: { teacherId, classIds },
  })

  return { ok: true as const, classIds }
})

/** Computes every Saturday in a term, minus holidays. */
export const generateSessionDates = onCall<{
  classId: string
  termStart: string
  termEnd: string
  skipDates?: string[]
}>({ region: 'us-central1' }, async (request) => {
  requireAdmin(request)
  const { classId, termStart, termEnd, skipDates = [] } = request.data

  const start = new Date(`${termStart}T00:00:00`)
  const end = new Date(`${termEnd}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpsError('invalid-argument', 'Invalid term dates.')
  }

  const skip = new Set(skipDates)
  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() + 1)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    if (!skip.has(key)) dates.push(key)
    cursor.setDate(cursor.getDate() + 7)
  }

  await getFirestore().doc(`classes/${classId}`).update({
    sessionDates: dates,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { sessionDates: dates }
})

/* ── Reports ──────────────────────────────────────────────── */

/** Publishing is the act that makes a report visible, so it is admin-only. */
export const publishPerformanceReport = onCall<{ reportId: string }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)
    const { reportId } = request.data
    const db = getFirestore()
    const ref = db.doc(`performanceReports/${reportId}`)

    const snap = await ref.get()
    if (!snap.exists) throw new HttpsError('not-found', 'Report not found.')

    const report = snap.data()!
    if (report.status === 'published') {
      throw new HttpsError('already-exists', 'That report is already published.')
    }

    await ref.update({
      status: 'published',
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: caller.uid,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await notify({
      userId: report.uid,
      type: 'report_published',
      title: 'New progress report',
      body: `A report for ${report.className ?? 'your class'} is ready to read.`,
      link: '/app/reports',
      entityType: 'report',
      entityId: reportId,
      priority: 'high',
    })

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'report.publish',
      targetType: 'report',
      targetId: reportId,
      after: { studentId: report.studentId },
    })

    return { ok: true as const }
  },
)

/* ── Messaging ────────────────────────────────────────────── */

/**
 * Creates a conversation. Done server-side because the role-pairing policy
 * needs lookups that security rules cannot perform cheaply.
 */
export const createConversation = onCall<{
  participantIds: string[]
  type?: 'direct' | 'group'
  title?: string
  classId?: string
}>({ region: 'us-central1' }, async (request) => {
  const caller = requireAuth(request)
  const { participantIds, type = 'direct', title, classId } = request.data
  const db = getFirestore()

  const everyone = [...new Set([caller.uid, ...participantIds])]
  if (everyone.length < 2) {
    throw new HttpsError('invalid-argument', 'A conversation needs at least two people.')
  }

  const userSnaps = await db.getAll(...everyone.map((uid) => db.doc(`users/${uid}`)))
  const missing = userSnaps.find((snap) => !snap.exists)
  if (missing) throw new HttpsError('not-found', 'One of the participants does not exist.')

  const roles: Record<string, string> = {}
  const names: Record<string, string> = {}
  for (const snap of userSnaps) {
    const data = snap.data()!
    roles[snap.id] = data.role
    names[snap.id] = data.displayName ?? ''
  }

  // Students may talk to staff, never to each other.
  if (caller.role === 'student') {
    const otherStudents = everyone.filter((uid) => uid !== caller.uid && roles[uid] === 'student')
    if (otherStudents.length) {
      throw new HttpsError('permission-denied', 'Students cannot message other students.')
    }
  }

  // A deterministic id for one-to-one threads prevents duplicate conversations.
  const conversationId =
    type === 'direct' && everyone.length === 2
      ? `dm_${[...everyone].sort().join('_')}`
      : db.collection('conversations').doc().id

  const ref = db.doc(`conversations/${conversationId}`)
  const existing = await ref.get()
  if (existing.exists) return { conversationId }

  await ref.set({
    id: conversationId,
    type,
    title: title ?? null,
    participantIds: everyone,
    participantRoles: roles,
    participantNames: names,
    classId: classId ?? null,
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    lastMessage: null,
    lastMessageAt: FieldValue.serverTimestamp(),
    unreadCounts: Object.fromEntries(everyone.map((uid) => [uid, 0])),
    readAt: {},
    isArchived: false,
    isLocked: false,
  })

  return { conversationId }
})

export const sendAnnouncement = onCall<{
  scope: 'school' | 'class'
  classId?: string
  title: string
  body: string
}>({ region: 'us-central1' }, async (request) => {
  const caller = requireAdmin(request)
  const { scope, classId, title, body } = request.data
  const db = getFirestore()

  let recipients: string[] = []
  if (scope === 'class') {
    if (!classId) throw new HttpsError('invalid-argument', 'classId is required.')
    const enrollments = await db
      .collection('enrollments')
      .where('classId', '==', classId)
      .where('status', '==', 'active')
      .get()
    recipients = enrollments.docs.map((doc) => doc.data().uid as string)
  } else {
    const users = await db.collection('users').where('status', '==', 'active').get()
    recipients = users.docs.map((doc) => doc.id)
  }

  recipients = [...new Set(recipients.filter(Boolean))]

  await Promise.all(
    recipients.map((userId) =>
      notify({
        userId,
        type: 'announcement',
        title,
        body,
        link: '/app/notifications',
        priority: 'normal',
      }),
    ),
  )

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'announcement.send',
    targetType: scope === 'class' ? 'class' : 'school',
    targetId: classId ?? 'all',
    after: { title, recipients: recipients.length },
  })

  return { recipients: recipients.length }
})

/** Keeps the thread preview and unread counts current. */
export const onMessageCreate = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: 'us-central1' },
  async (event) => {
    const message = event.data?.data()
    if (!message) return

    const db = getFirestore()
    const ref = db.doc(`conversations/${event.params.conversationId}`)
    const snap = await ref.get()
    if (!snap.exists) return

    const conversation = snap.data()!
    const others = (conversation.participantIds as string[]).filter(
      (uid) => uid !== message.senderId,
    )

    const increments: Record<string, FirebaseFirestore.FieldValue> = {}
    for (const uid of others) {
      increments[`unreadCounts.${uid}`] = FieldValue.increment(1)
    }

    await ref.update({
      lastMessage: {
        text: String(message.text).slice(0, 140),
        senderId: message.senderId,
        senderName: message.senderName ?? '',
        sentAt: message.sentAt ?? FieldValue.serverTimestamp(),
      },
      lastMessageAt: FieldValue.serverTimestamp(),
      ...increments,
    })

    await Promise.all(
      others.map((userId) =>
        notify({
          userId,
          type: 'new_message',
          title: message.senderName || 'New message',
          body: String(message.text).slice(0, 120),
          link: '/app/messages',
          entityType: 'conversation',
          entityId: event.params.conversationId,
        }),
      ),
    )
  },
)
