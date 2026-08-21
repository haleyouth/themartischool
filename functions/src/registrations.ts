import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import {
  adminUids,
  currentSchoolYear,
  formatStudentId,
  generateTempPassword,
  notify,
  requireAdmin,
  toShadowEmail,
  writeAudit,
} from './shared'

interface ApproveRequest {
  registrationId: string
  gradeLevel: string
  classId?: string
}

interface ApproveResponse {
  studentId: string
  tempPassword: string
  uid: string
}

/**
 * Approves an application, issues a student ID, and provisions the account.
 *
 * This runs in phases because a Firestore transaction cannot span the Auth
 * API. The ID is reserved BEFORE the Auth user is created, so a crash between
 * the two burns an ID number rather than risking a duplicate, cheap insurance
 * against two students sharing a login.
 */
export const approveRegistration = onCall<ApproveRequest, Promise<ApproveResponse>>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)
    const db = getFirestore()

    const { registrationId, gradeLevel, classId } = request.data
    if (!registrationId || !gradeLevel) {
      throw new HttpsError('invalid-argument', 'registrationId and gradeLevel are required.')
    }

    const schoolYear = currentSchoolYear()
    const regRef = db.doc(`registrations/${registrationId}`)
    const counterRef = db.doc(`counters/studentId_${schoolYear}`)

    // ── Phase 1: claim an ID atomically ──────────────────────
    const claim = await db.runTransaction(async (tx) => {
      const regSnap = await tx.get(regRef)
      if (!regSnap.exists) throw new HttpsError('not-found', 'Registration not found.')

      const reg = regSnap.data()!

      // Idempotency: approving twice must never mint a second account.
      if (reg.status === 'approved') {
        throw new HttpsError(
          'already-exists',
          `Already approved as ${reg.assignedStudentId ?? 'unknown'}.`,
        )
      }
      if (!['pending', 'under_review', 'waitlisted', 'provisioning_failed'].includes(reg.status)) {
        throw new HttpsError('failed-precondition', `Cannot approve status "${reg.status}".`)
      }

      const counterSnap = await tx.get(counterRef)
      const next = ((counterSnap.exists ? counterSnap.data()!.value : 0) as number) + 1
      if (next > 9999) {
        throw new HttpsError('resource-exhausted', 'Student ID sequence exhausted for this year.')
      }

      const studentId = formatStudentId(schoolYear, next)

      tx.set(
        counterRef,
        { value: next, schoolYear, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
      tx.set(db.doc(`studentIdReservations/${studentId}`), {
        studentId,
        registrationId,
        schoolYear,
        state: 'claimed',
        claimedAt: FieldValue.serverTimestamp(),
      })
      tx.update(regRef, {
        status: 'provisioning',
        assignedStudentId: studentId,
        reviewedBy: caller.uid,
        reviewedAt: FieldValue.serverTimestamp(),
      })

      return { studentId, reg }
    })

    const { studentId, reg } = claim
    const shadowEmail = toShadowEmail(studentId)
    const tempPassword = generateTempPassword()
    const displayName = `${reg.firstName} ${reg.lastName}`.trim()

    // ── Phase 2: create the Auth user ────────────────────────
    let uid: string
    try {
      const user = await getAuth().createUser({
        email: shadowEmail,
        emailVerified: false,
        password: tempPassword,
        displayName,
        disabled: false,
      })
      uid = user.uid
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'auth/email-already-exists') {
        // Recovering a partially-provisioned account from an earlier crash.
        const existing = await getAuth().getUserByEmail(shadowEmail)
        uid = existing.uid
        await getAuth().updateUser(uid, { password: tempPassword, displayName })
      } else {
        await regRef.update({
          status: 'provisioning_failed',
          provisioningError: String(error),
        })
        throw new HttpsError('internal', 'Could not create the student account.')
      }
    }

    // ── Phase 3: claims and documents ────────────────────────
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
      displayName,
      email: null,
      shadowEmail,
      phone: null,
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
      firstName: reg.firstName,
      lastName: reg.lastName,
      preferredName: reg.preferredName ?? null,
      dateOfBirth: reg.dateOfBirth,
      gradeLevel,
      turkishLevel: reg.turkishLevel ?? 'beginner',
      guardianName: reg.guardianName,
      guardianEmail: reg.guardianEmail,
      guardianPhone: reg.guardianPhone,
      secondaryGuardian: reg.secondaryGuardian ?? null,
      emergencyContact: reg.emergencyContact,
      medicalNotes: reg.medicalNotes ?? null,
      photoConsent: reg.photoConsent ?? false,
      // Reserved for a future multi-guardian login model.
      guardianUids: [],
      enrollmentStatus: 'active',
      schoolYear,
      registrationId,
      currentClassIds: classId ? [classId] : [],
      attendanceSummary: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        totalSessions: 0,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batch.update(regRef, {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      createdUid: uid,
    })

    batch.update(db.doc(`studentIdReservations/${studentId}`), { state: 'issued', uid })

    if (classId) {
      batch.set(db.doc(`enrollments/${studentId}_${classId}`), {
        id: `${studentId}_${classId}`,
        studentId,
        classId,
        uid,
        schoolYear,
        status: 'active',
        enrolledAt: FieldValue.serverTimestamp(),
        enrolledBy: caller.uid,
        droppedAt: null,
      })
      batch.update(db.doc(`classes/${classId}`), {
        enrolledCount: FieldValue.increment(1),
        studentIds: FieldValue.arrayUnion(studentId),
      })
    }

    await batch.commit()

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'registration.approve',
      targetType: 'registration',
      targetId: registrationId,
      after: { studentId, uid, gradeLevel, classId: classId ?? null },
    })

    // Tell the other admins. Previously only submission raised a notice, so a
    // director never learned that a principal had approved an application.
    const others = (await adminUids()).filter((id) => id !== caller.uid)
    await Promise.all(
      others.map((userId) =>
        notify({
          userId,
          type: 'registration_approved',
          title: 'Registration approved',
          body: `${reg.firstName} ${reg.lastName} was approved as ${studentId}.`,
          link: '/app/students',
          entityType: 'student',
          entityId: studentId,
          priority: 'normal',
        }),
      ),
    )

    // The password is returned once for in-person handover and never stored.
    return { studentId, tempPassword, uid }
  },
)

export const rejectRegistration = onCall<{ registrationId: string; reason?: string }>(
  { region: 'us-central1' },
  async (request) => {
    const caller = requireAdmin(request)
    const { registrationId, reason } = request.data
    const db = getFirestore()
    const ref = db.doc(`registrations/${registrationId}`)

    const snap = await ref.get()
    if (!snap.exists) throw new HttpsError('not-found', 'Registration not found.')
    if (snap.data()!.status === 'approved') {
      throw new HttpsError('failed-precondition', 'Cannot reject an approved application.')
    }

    await ref.update({
      status: 'rejected',
      rejectionReason: reason ?? null,
      reviewedBy: caller.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    })

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'registration.reject',
      targetType: 'registration',
      targetId: registrationId,
      after: { reason: reason ?? null },
    })

    return { ok: true as const }
  },
)

/** Tells the admins a family has applied, so applications are not missed. */
export const onRegistrationCreated = onDocumentCreated(
  { document: 'registrations/{registrationId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
    const recipients = await adminUids()

    await Promise.all(
      recipients.map((userId) =>
        notify({
          userId,
          type: 'registration_submitted',
          title: 'New registration',
          body: `${name} has applied for ${data.requestedGradeLevel ?? 'a grade'}.`,
          link: '/app/registrations',
          entityType: 'registration',
          entityId: event.params.registrationId,
          priority: 'high',
        }),
      ),
    )
  },
)
