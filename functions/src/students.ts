import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import {
  currentSchoolYear,
  formatStudentId,
  generateTempPassword,
  requireAdmin,
  toShadowEmail,
  writeAudit,
} from './shared'

interface GuardianInput {
  name: string
  email: string
  phone: string
}

interface CreateStudentData {
  firstName: string
  lastName: string
  preferredName?: string | null
  dateOfBirth: string
  gradeLevel: string
  turkishLevel?: string
  guardian: GuardianInput
  emergencyContact: { name: string; phone: string; relationship: string }
  medicalNotes?: string | null
  photoConsent?: boolean
  classId?: string
}

/**
 * Creates a student directly, without an application.
 *
 * This mirrors approveRegistration: a transaction claims the next student ID
 * so two admins adding students at the same moment cannot collide, then the
 * Auth user is created outside that transaction, since the Auth API cannot
 * take part in a Firestore transaction.
 */
export const createStudent = onCall<CreateStudentData>(async (request) => {
  const caller = requireAdmin(request)
  const data = request.data
  const db = getFirestore()

  if (!data?.firstName?.trim() || !data?.lastName?.trim()) {
    throw new HttpsError('invalid-argument', 'First and last name are required.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth ?? '')) {
    throw new HttpsError('invalid-argument', 'Date of birth must be YYYY-MM-DD.')
  }
  if (!data.guardian?.email?.includes('@')) {
    throw new HttpsError('invalid-argument', 'A guardian email is required.')
  }

  const schoolYear = currentSchoolYear()
  const counterRef = db.doc(`counters/studentId_${schoolYear}`)

  const studentId = await db.runTransaction(async (tx) => {
    const counter = await tx.get(counterRef)
    const next = (counter.exists ? (counter.data()!.value as number) : 0) + 1
    if (next > 9999) throw new HttpsError('resource-exhausted', 'Year sequence exhausted.')

    const id = formatStudentId(schoolYear, next)
    tx.set(counterRef, { value: next, schoolYear, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    // Reserve before provisioning, so a crash burns an ID rather than
    // handing the same one to two students.
    tx.set(db.doc(`studentIdReservations/${id}`), {
      studentId: id,
      schoolYear,
      state: 'claimed',
      claimedAt: FieldValue.serverTimestamp(),
      createdBy: caller.uid,
    })
    return id
  })

  const shadowEmail = toShadowEmail(studentId)
  const tempPassword = generateTempPassword()

  let uid: string
  try {
    const user = await getAuth().createUser({
      email: shadowEmail,
      password: tempPassword,
      displayName: `${data.firstName.trim()} ${data.lastName.trim()}`,
    })
    uid = user.uid
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'auth/email-already-exists') {
      // Recover from a half finished earlier attempt rather than stranding it.
      uid = (await getAuth().getUserByEmail(shadowEmail)).uid
      await getAuth().updateUser(uid, { password: tempPassword })
    } else {
      await db.doc(`studentIdReservations/${studentId}`).update({ state: 'failed' })
      throw new HttpsError('internal', 'Could not create the student account.')
    }
  }

  await getAuth().setCustomUserClaims(uid, {
    role: 'student',
    active: true,
    v: 1,
    studentId,
    schoolYear,
  })

  const batch = db.batch()

  batch.set(db.doc(`users/${uid}`), {
    uid,
    role: 'student',
    authMethod: 'studentId',
    studentId,
    displayName: `${data.firstName.trim()} ${data.lastName.trim()}`,
    email: null,
    shadowEmail,
    photoURL: null,
    status: 'active',
    mustChangePassword: true,
    claimsVersion: 1,
    locale: 'en',
    notificationPrefs: {
      email: true,
      inApp: true,
      attendanceAlerts: true,
      reportPublished: true,
      newMessage: true,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: null,
  })

  batch.set(db.doc(`students/${studentId}`), {
    studentId,
    uid,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    preferredName: data.preferredName?.trim() || null,
    dateOfBirth: data.dateOfBirth,
    gradeLevel: data.gradeLevel,
    turkishLevel: data.turkishLevel ?? 'beginner',
    guardianName: data.guardian.name.trim(),
    guardianEmail: data.guardian.email.trim().toLowerCase(),
    guardianPhone: data.guardian.phone.trim(),
    guardianUids: [],
    secondaryGuardian: null,
    emergencyContact: data.emergencyContact,
    medicalNotes: data.medicalNotes?.trim() || null,
    photoConsent: data.photoConsent ?? false,
    enrollmentStatus: 'active',
    schoolYear,
    registrationId: null,
    currentClassIds: data.classId ? [data.classId] : [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  batch.update(db.doc(`studentIdReservations/${studentId}`), { state: 'issued', uid })

  if (data.classId) {
    batch.set(db.doc(`enrollments/${studentId}_${data.classId}`), {
      id: `${studentId}_${data.classId}`,
      studentId,
      classId: data.classId,
      uid,
      schoolYear,
      status: 'active',
      enrolledAt: FieldValue.serverTimestamp(),
      enrolledBy: caller.uid,
      droppedAt: null,
    })
    batch.update(db.doc(`classes/${data.classId}`), {
      enrolledCount: FieldValue.increment(1),
      studentIds: FieldValue.arrayUnion(studentId),
    })
  }

  await batch.commit()

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'student.create',
    targetType: 'student',
    targetId: studentId,
    after: { studentId, gradeLevel: data.gradeLevel },
  })

  return { studentId, tempPassword, uid }
})

interface UpdateStudentData {
  studentId: string
  firstName?: string
  lastName?: string
  preferredName?: string | null
  gradeLevel?: string
  turkishLevel?: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  medicalNotes?: string | null
  enrollmentStatus?: 'active' | 'inactive' | 'graduated' | 'withdrawn'
}

/**
 * Edits a student record. Rules already permit an admin to write most of these
 * fields directly, but going through a callable keeps the display name on the
 * Auth user in step and records who changed what.
 */
export const updateStudent = onCall<UpdateStudentData>(async (request) => {
  const caller = requireAdmin(request)
  const { studentId, ...changes } = request.data ?? {}
  const db = getFirestore()

  if (!studentId) throw new HttpsError('invalid-argument', 'A student ID is required.')

  const ref = db.doc(`students/${studentId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Student not found.')
  const before = snap.data()!

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) update[key] = value
  }

  await ref.update(update)

  // Keep the Auth display name and the record from drifting apart.
  if (changes.firstName || changes.lastName) {
    const displayName = `${changes.firstName ?? before.firstName} ${
      changes.lastName ?? before.lastName
    }`
    await getAuth().updateUser(before.uid, { displayName })
    await db.doc(`users/${before.uid}`).update({
      displayName,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'student.update',
    targetType: 'student',
    targetId: studentId,
    before: { gradeLevel: before.gradeLevel, enrollmentStatus: before.enrollmentStatus },
    after: update,
  })

  return { ok: true as const }
})

interface DeleteStudentData {
  studentId: string
  /** Director only. Removes the records outright rather than archiving. */
  permanent?: boolean
}

/**
 * Removes a student.
 *
 * The default is an archive: the sign in is disabled and enrollments are
 * dropped, but attendance and reports stay intact, because a school needs its
 * historic record. A director can delete permanently, which also removes the
 * Auth user. Attendance history is deliberately left behind either way.
 */
export const deleteStudent = onCall<DeleteStudentData>(async (request) => {
  const caller = requireAdmin(request)
  const { studentId, permanent = false } = request.data ?? {}
  const db = getFirestore()

  if (!studentId) throw new HttpsError('invalid-argument', 'A student ID is required.')
  if (permanent && caller.role !== 'director') {
    throw new HttpsError('permission-denied', 'Only a director can permanently delete a student.')
  }

  const ref = db.doc(`students/${studentId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Student not found.')
  const student = snap.data()!

  // Drop enrollments and decrement the class counters either way.
  const enrollments = await db
    .collection('enrollments')
    .where('studentId', '==', studentId)
    .where('status', '==', 'active')
    .get()

  const batch = db.batch()
  for (const enrollment of enrollments.docs) {
    const classId = enrollment.data().classId as string
    if (permanent) batch.delete(enrollment.ref)
    else batch.update(enrollment.ref, { status: 'dropped', droppedAt: FieldValue.serverTimestamp() })

    batch.update(db.doc(`classes/${classId}`), {
      enrolledCount: FieldValue.increment(-1),
      studentIds: FieldValue.arrayRemove(studentId),
    })
  }

  if (permanent) {
    batch.delete(ref)
    batch.delete(db.doc(`users/${student.uid}`))
  } else {
    batch.update(ref, {
      enrollmentStatus: 'withdrawn',
      currentClassIds: [],
      updatedAt: FieldValue.serverTimestamp(),
    })
    batch.update(db.doc(`users/${student.uid}`), {
      status: 'archived',
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()

  // Lock the account out in both cases, so an archived student cannot sign in.
  try {
    if (permanent) await getAuth().deleteUser(student.uid)
    else await getAuth().updateUser(student.uid, { disabled: true })
  } catch (error) {
    console.error('Auth cleanup failed for', studentId, error)
  }

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: permanent ? 'student.delete' : 'student.archive',
    targetType: 'student',
    targetId: studentId,
    before: { name: `${student.firstName} ${student.lastName}` },
  })

  return { ok: true as const, permanent }
})

/** Restores an archived student and re-enables their sign in. */
export const restoreStudent = onCall<{ studentId: string }>(async (request) => {
  const caller = requireAdmin(request)
  const { studentId } = request.data ?? {}
  const db = getFirestore()

  if (!studentId) throw new HttpsError('invalid-argument', 'A student ID is required.')

  const ref = db.doc(`students/${studentId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Student not found.')
  const student = snap.data()!

  await ref.update({
    enrollmentStatus: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  })
  await db.doc(`users/${student.uid}`).update({
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  })
  await getAuth().updateUser(student.uid, { disabled: false })

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'student.restore',
    targetType: 'student',
    targetId: studentId,
  })

  return { ok: true as const }
})
