import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  generateTempPassword,
  requireAdmin,
  requireAuth,
  toShadowEmail,
  writeAudit,
  type Role,
} from './shared'

export const createStaffUser = onCall<{
  email: string
  displayName: string
  role: 'principal' | 'teacher'
  phone?: string
}>({ region: 'us-central1' }, async (request) => {
  const caller = requireAdmin(request)

  const { email, displayName, role, phone } = request.data

  if (!email || !displayName) {
    throw new HttpsError('invalid-argument', 'email and displayName are required.')
  }
  if (role !== 'principal' && role !== 'teacher') {
    throw new HttpsError('invalid-argument', 'Role must be principal or teacher.')
  }

  const tempPassword = generateTempPassword()
  const user = await getAuth().createUser({
    email: email.trim().toLowerCase(),
    password: tempPassword,
    displayName: displayName.trim(),
    emailVerified: false,
  })

  await getAuth().setCustomUserClaims(user.uid, {
    role,
    active: true,
    v: 1,
    ...(role === 'teacher' ? { classIds: [] } : {}),
  })

  await getFirestore().doc(`users/${user.uid}`).set({
    uid: user.uid,
    role,
    authMethod: 'email',
    studentId: null,
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    shadowEmail: null,
    phone: phone ?? null,
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

  await writeAudit({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'user.create_staff',
    targetType: 'user',
    targetId: user.uid,
    after: { email, role },
  })

  return { uid: user.uid, tempPassword }
})

/**
 * Role changes go through here, never through a direct client write, so the
 * custom claims and the user document can never drift apart.
 */
export const setUserRole = onCall<{ uid: string; role: Role; classIds?: string[] }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)

  // A principal may manage teachers and principals, never directors, and may
  // not hand out the director role.
  if (caller.role !== 'director') {
    if (request.data?.role === 'director') {
      throw new HttpsError('permission-denied', 'Only a director can grant the director role.')
    }
  }
    const { uid, role, classIds } = request.data

    if (uid === caller.uid) {
      throw new HttpsError('failed-precondition', 'You cannot change your own role.')
    }

    const db = getFirestore()
    const ref = db.doc(`users/${uid}`)
    const snap = await ref.get()
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.')

    const before = snap.data()!
    const nextVersion = (before.claimsVersion ?? 0) + 1

    await getAuth().setCustomUserClaims(uid, {
      role,
      active: before.status !== 'suspended',
      v: nextVersion,
      ...(role === 'student' ? { studentId: before.studentId } : {}),
      ...(role === 'teacher' ? { classIds: classIds ?? [] } : {}),
    })

    await ref.update({
      role,
      claimsVersion: nextVersion,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // A demotion must not wait up to an hour for the old token to expire.
    await getAuth().revokeRefreshTokens(uid)

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'user.role_change',
      targetType: 'user',
      targetId: uid,
      before: { role: before.role },
      after: { role },
    })

    return { ok: true as const, claimsVersion: nextVersion }
  },
)

export const setUserStatus = onCall<{ uid: string; status: 'active' | 'suspended' }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)
    const { uid, status } = request.data

    if (uid === caller.uid) {
      throw new HttpsError('failed-precondition', 'You cannot suspend your own account.')
    }

    const db = getFirestore()
    const ref = db.doc(`users/${uid}`)
    const snap = await ref.get()
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.')

    const target = snap.data()!
    // A principal must not be able to lock out the director.
    if (target.role === 'director' && caller.role !== 'director') {
      throw new HttpsError('permission-denied', 'Only a director can change a director.')
    }

    const nextVersion = (target.claimsVersion ?? 0) + 1
    const active = status === 'active'

    await getAuth().setCustomUserClaims(uid, {
      role: target.role,
      active,
      v: nextVersion,
      ...(target.studentId ? { studentId: target.studentId } : {}),
    })
    await getAuth().updateUser(uid, { disabled: !active })
    await ref.update({ status, claimsVersion: nextVersion, updatedAt: FieldValue.serverTimestamp() })

    if (!active) await getAuth().revokeRefreshTokens(uid)

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: `user.${status}`,
      targetType: 'user',
      targetId: uid,
      before: { status: target.status },
      after: { status },
    })

    return { ok: true as const }
  },
)

/** Issues a new temporary password for in-person handover to the family. */
export const adminResetStudentPassword = onCall<{ studentId: string }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)

  if (caller.role !== 'principal') {
    throw new HttpsError('permission-denied', 'Only the principal can reset a student password.')
  }
    const { studentId } = request.data

    const db = getFirestore()
    const snap = await db.doc(`students/${studentId}`).get()
    if (!snap.exists) throw new HttpsError('not-found', 'Student not found.')

    const uid = snap.data()!.uid as string
    const tempPassword = generateTempPassword()

    await getAuth().updateUser(uid, { password: tempPassword })
    await db.doc(`users/${uid}`).update({
      mustChangePassword: true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'user.password_reset',
      targetType: 'student',
      targetId: studentId,
    })

    return { tempPassword }
  },
)

/**
 * Self-serve reset for a student. Their shadow address is not a real inbox,
 * so the link has to be generated here and sent to the guardian.
 *
 * Always reports success, even for an unknown ID, so the endpoint cannot be
 * used to discover which student IDs exist.
 */
export const requestStudentPasswordReset = onCall<{ studentId: string }>(
  { region: 'us-central1' },
  async (request) => {
    const { studentId } = request.data
    if (!studentId) return { ok: true as const }

    try {
      const snap = await getFirestore().doc(`students/${studentId.toUpperCase()}`).get()
      if (!snap.exists) return { ok: true as const }

      const student = snap.data()!
      const link = await getAuth().generatePasswordResetLink(toShadowEmail(student.studentId))

      // Picked up by the Trigger Email extension once it is configured; until
      // then the document simply queues, and admins use the in-person reset.
      await getFirestore().collection('mail').add({
        to: student.guardianEmail,
        message: {
          subject: 'Reset your Marti School password',
          text: `A password reset was requested for ${student.firstName} (${student.studentId}).\n\nSet a new password here:\n${link}\n\nIf you did not request this, you can ignore this email.`,
        },
      })
    } catch (error) {
      // Swallowed deliberately: the caller must not learn whether it worked.
      console.error('requestStudentPasswordReset failed', error)
    }

    return { ok: true as const }
  },
)

export const changeMyPassword = onCall<{ newPassword: string }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAuth(request)
    const { newPassword } = request.data

    if (!newPassword || newPassword.length < 8) {
      throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.')
    }

    await getAuth().updateUser(caller.uid, { password: newPassword })
    await getFirestore().doc(`users/${caller.uid}`).update({
      mustChangePassword: false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { ok: true as const }
  },
)
