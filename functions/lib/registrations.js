"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRegistrationCreated = exports.rejectRegistration = exports.approveRegistration = void 0;
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const shared_1 = require("./shared");
/**
 * Approves an application, issues a student ID, and provisions the account.
 *
 * This runs in phases because a Firestore transaction cannot span the Auth
 * API. The ID is reserved BEFORE the Auth user is created, so a crash between
 * the two burns an ID number rather than risking a duplicate — cheap insurance
 * against two students sharing a login.
 */
exports.approveRegistration = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireAdmin)(request);
    const db = (0, firestore_1.getFirestore)();
    const { registrationId, gradeLevel, classId } = request.data;
    if (!registrationId || !gradeLevel) {
        throw new https_1.HttpsError('invalid-argument', 'registrationId and gradeLevel are required.');
    }
    const schoolYear = (0, shared_1.currentSchoolYear)();
    const regRef = db.doc(`registrations/${registrationId}`);
    const counterRef = db.doc(`counters/studentId_${schoolYear}`);
    // ── Phase 1: claim an ID atomically ──────────────────────
    const claim = await db.runTransaction(async (tx) => {
        const regSnap = await tx.get(regRef);
        if (!regSnap.exists)
            throw new https_1.HttpsError('not-found', 'Registration not found.');
        const reg = regSnap.data();
        // Idempotency: approving twice must never mint a second account.
        if (reg.status === 'approved') {
            throw new https_1.HttpsError('already-exists', `Already approved as ${reg.assignedStudentId ?? 'unknown'}.`);
        }
        if (!['pending', 'under_review', 'waitlisted', 'provisioning_failed'].includes(reg.status)) {
            throw new https_1.HttpsError('failed-precondition', `Cannot approve status "${reg.status}".`);
        }
        const counterSnap = await tx.get(counterRef);
        const next = (counterSnap.exists ? counterSnap.data().value : 0) + 1;
        if (next > 9999) {
            throw new https_1.HttpsError('resource-exhausted', 'Student ID sequence exhausted for this year.');
        }
        const studentId = (0, shared_1.formatStudentId)(schoolYear, next);
        tx.set(counterRef, { value: next, schoolYear, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(db.doc(`studentIdReservations/${studentId}`), {
            studentId,
            registrationId,
            schoolYear,
            state: 'claimed',
            claimedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.update(regRef, {
            status: 'provisioning',
            assignedStudentId: studentId,
            reviewedBy: caller.uid,
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { studentId, reg };
    });
    const { studentId, reg } = claim;
    const shadowEmail = (0, shared_1.toShadowEmail)(studentId);
    const tempPassword = (0, shared_1.generateTempPassword)();
    const displayName = `${reg.firstName} ${reg.lastName}`.trim();
    // ── Phase 2: create the Auth user ────────────────────────
    let uid;
    try {
        const user = await (0, auth_1.getAuth)().createUser({
            email: shadowEmail,
            emailVerified: false,
            password: tempPassword,
            displayName,
            disabled: false,
        });
        uid = user.uid;
    }
    catch (error) {
        const code = error.code;
        if (code === 'auth/email-already-exists') {
            // Recovering a partially-provisioned account from an earlier crash.
            const existing = await (0, auth_1.getAuth)().getUserByEmail(shadowEmail);
            uid = existing.uid;
            await (0, auth_1.getAuth)().updateUser(uid, { password: tempPassword, displayName });
        }
        else {
            await regRef.update({
                status: 'provisioning_failed',
                provisioningError: String(error),
            });
            throw new https_1.HttpsError('internal', 'Could not create the student account.');
        }
    }
    // ── Phase 3: claims and documents ────────────────────────
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        role: 'student',
        active: true,
        v: 1,
        studentId,
        schoolYear,
    });
    const batch = db.batch();
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        lastLoginAt: null,
    });
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
            lastUpdated: firestore_1.FieldValue.serverTimestamp(),
        },
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.update(regRef, {
        status: 'approved',
        approvedAt: firestore_1.FieldValue.serverTimestamp(),
        createdUid: uid,
    });
    batch.update(db.doc(`studentIdReservations/${studentId}`), { state: 'issued', uid });
    if (classId) {
        batch.set(db.doc(`enrollments/${studentId}_${classId}`), {
            id: `${studentId}_${classId}`,
            studentId,
            classId,
            uid,
            schoolYear,
            status: 'active',
            enrolledAt: firestore_1.FieldValue.serverTimestamp(),
            enrolledBy: caller.uid,
            droppedAt: null,
        });
        batch.update(db.doc(`classes/${classId}`), {
            enrolledCount: firestore_1.FieldValue.increment(1),
            studentIds: firestore_1.FieldValue.arrayUnion(studentId),
        });
    }
    await batch.commit();
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: 'registration.approve',
        targetType: 'registration',
        targetId: registrationId,
        after: { studentId, uid, gradeLevel, classId: classId ?? null },
    });
    // The password is returned once for in-person handover and never stored.
    return { studentId, tempPassword, uid };
});
exports.rejectRegistration = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireAdmin)(request);
    const { registrationId, reason } = request.data;
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`registrations/${registrationId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Registration not found.');
    if (snap.data().status === 'approved') {
        throw new https_1.HttpsError('failed-precondition', 'Cannot reject an approved application.');
    }
    await ref.update({
        status: 'rejected',
        rejectionReason: reason ?? null,
        reviewedBy: caller.uid,
        reviewedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: 'registration.reject',
        targetType: 'registration',
        targetId: registrationId,
        after: { reason: reason ?? null },
    });
    return { ok: true };
});
/** Tells the admins a family has applied, so applications are not missed. */
exports.onRegistrationCreated = (0, firestore_2.onDocumentCreated)({ document: 'registrations/{registrationId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    const recipients = await (0, shared_1.adminUids)();
    await Promise.all(recipients.map((userId) => (0, shared_1.notify)({
        userId,
        type: 'registration_submitted',
        title: 'New registration',
        body: `${name} has applied for ${data.requestedGradeLevel ?? '—'}.`,
        link: '/app/registrations',
        entityType: 'registration',
        entityId: event.params.registrationId,
        priority: 'high',
    })));
});
//# sourceMappingURL=registrations.js.map