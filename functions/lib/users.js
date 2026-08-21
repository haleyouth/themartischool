"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMyPassword = exports.requestStudentPasswordReset = exports.adminResetStudentPassword = exports.setUserStatus = exports.setUserRole = exports.createStaffUser = void 0;
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const shared_1 = require("./shared");
exports.createStaffUser = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireDirector)(request);
    const { email, displayName, role, phone } = request.data;
    if (!email || !displayName) {
        throw new https_1.HttpsError('invalid-argument', 'email and displayName are required.');
    }
    if (role !== 'principal' && role !== 'teacher') {
        throw new https_1.HttpsError('invalid-argument', 'Role must be principal or teacher.');
    }
    const tempPassword = (0, shared_1.generateTempPassword)();
    const user = await (0, auth_1.getAuth)().createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        displayName: displayName.trim(),
        emailVerified: false,
    });
    await (0, auth_1.getAuth)().setCustomUserClaims(user.uid, {
        role,
        active: true,
        v: 1,
        ...(role === 'teacher' ? { classIds: [] } : {}),
    });
    await (0, firestore_1.getFirestore)().doc(`users/${user.uid}`).set({
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        lastLoginAt: null,
    });
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: 'user.create_staff',
        targetType: 'user',
        targetId: user.uid,
        after: { email, role },
    });
    return { uid: user.uid, tempPassword };
});
/**
 * Role changes go through here, never through a direct client write, so the
 * custom claims and the user document can never drift apart.
 */
exports.setUserRole = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireDirector)(request);
    const { uid, role, classIds } = request.data;
    if (uid === caller.uid) {
        throw new https_1.HttpsError('failed-precondition', 'You cannot change your own role.');
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'User not found.');
    const before = snap.data();
    const nextVersion = (before.claimsVersion ?? 0) + 1;
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        role,
        active: before.status !== 'suspended',
        v: nextVersion,
        ...(role === 'student' ? { studentId: before.studentId } : {}),
        ...(role === 'teacher' ? { classIds: classIds ?? [] } : {}),
    });
    await ref.update({
        role,
        claimsVersion: nextVersion,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // A demotion must not wait up to an hour for the old token to expire.
    await (0, auth_1.getAuth)().revokeRefreshTokens(uid);
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: 'user.role_change',
        targetType: 'user',
        targetId: uid,
        before: { role: before.role },
        after: { role },
    });
    return { ok: true, claimsVersion: nextVersion };
});
exports.setUserStatus = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireAdmin)(request);
    const { uid, status } = request.data;
    if (uid === caller.uid) {
        throw new https_1.HttpsError('failed-precondition', 'You cannot suspend your own account.');
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'User not found.');
    const target = snap.data();
    // A principal must not be able to lock out the director.
    if (target.role === 'director' && caller.role !== 'director') {
        throw new https_1.HttpsError('permission-denied', 'Only a director can change a director.');
    }
    const nextVersion = (target.claimsVersion ?? 0) + 1;
    const active = status === 'active';
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        role: target.role,
        active,
        v: nextVersion,
        ...(target.studentId ? { studentId: target.studentId } : {}),
    });
    await (0, auth_1.getAuth)().updateUser(uid, { disabled: !active });
    await ref.update({ status, claimsVersion: nextVersion, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    if (!active)
        await (0, auth_1.getAuth)().revokeRefreshTokens(uid);
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: `user.${status}`,
        targetType: 'user',
        targetId: uid,
        before: { status: target.status },
        after: { status },
    });
    return { ok: true };
});
/** Issues a new temporary password for in-person handover to the family. */
exports.adminResetStudentPassword = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireAdmin)(request);
    const { studentId } = request.data;
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.doc(`students/${studentId}`).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Student not found.');
    const uid = snap.data().uid;
    const tempPassword = (0, shared_1.generateTempPassword)();
    await (0, auth_1.getAuth)().updateUser(uid, { password: tempPassword });
    await db.doc(`users/${uid}`).update({
        mustChangePassword: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, shared_1.writeAudit)({
        actorUid: caller.uid,
        actorRole: caller.role,
        action: 'user.password_reset',
        targetType: 'student',
        targetId: studentId,
    });
    return { tempPassword };
});
/**
 * Self-serve reset for a student. Their shadow address is not a real inbox,
 * so the link has to be generated here and sent to the guardian.
 *
 * Always reports success, even for an unknown ID, so the endpoint cannot be
 * used to discover which student IDs exist.
 */
exports.requestStudentPasswordReset = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { studentId } = request.data;
    if (!studentId)
        return { ok: true };
    try {
        const snap = await (0, firestore_1.getFirestore)().doc(`students/${studentId.toUpperCase()}`).get();
        if (!snap.exists)
            return { ok: true };
        const student = snap.data();
        const link = await (0, auth_1.getAuth)().generatePasswordResetLink((0, shared_1.toShadowEmail)(student.studentId));
        // Picked up by the Trigger Email extension once it is configured; until
        // then the document simply queues, and admins use the in-person reset.
        await (0, firestore_1.getFirestore)().collection('mail').add({
            to: student.guardianEmail,
            message: {
                subject: 'Reset your Marti School password',
                text: `A password reset was requested for ${student.firstName} (${student.studentId}).\n\nSet a new password here:\n${link}\n\nIf you did not request this, you can ignore this email.`,
            },
        });
    }
    catch (error) {
        // Swallowed deliberately: the caller must not learn whether it worked.
        console.error('requestStudentPasswordReset failed', error);
    }
    return { ok: true };
});
exports.changeMyPassword = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const caller = (0, shared_1.requireAuth)(request);
    const { newPassword } = request.data;
    if (!newPassword || newPassword.length < 8) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 8 characters.');
    }
    await (0, auth_1.getAuth)().updateUser(caller.uid, { password: newPassword });
    await (0, firestore_1.getFirestore)().doc(`users/${caller.uid}`).update({
        mustChangePassword: false,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
//# sourceMappingURL=users.js.map