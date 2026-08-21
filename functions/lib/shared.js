"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_ID_PATTERN = exports.STUDENT_ID_PREFIX = exports.SHADOW_EMAIL_DOMAIN = void 0;
exports.formatStudentId = formatStudentId;
exports.toShadowEmail = toShadowEmail;
exports.currentSchoolYear = currentSchoolYear;
exports.generateTempPassword = generateTempPassword;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireDirector = requireDirector;
exports.writeAudit = writeAudit;
exports.notify = notify;
exports.adminUids = adminUids;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const node_crypto_1 = require("node:crypto");
exports.SHADOW_EMAIL_DOMAIN = 'students.themartischool.app';
exports.STUDENT_ID_PREFIX = 'MRT';
exports.STUDENT_ID_PATTERN = /^MRT-\d{4}-\d{4}$/;
/**
 * Must stay identical to src/lib/studentId.ts on the client. If these two ever
 * disagree, students silently cannot sign in.
 */
function formatStudentId(schoolYear, sequence) {
    return `${exports.STUDENT_ID_PREFIX}-${schoolYear}-${String(sequence).padStart(4, '0')}`;
}
function toShadowEmail(studentId) {
    const canonical = studentId.trim().toUpperCase();
    if (!exports.STUDENT_ID_PATTERN.test(canonical)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid student ID: ${studentId}`);
    }
    return `${canonical.toLowerCase()}@${exports.SHADOW_EMAIL_DOMAIN}`;
}
/** The academic year is labelled by the year it begins; July is the cutover. */
function currentSchoolYear(now = new Date()) {
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}
/**
 * Human-transcribable temporary password: no ambiguous glyphs (0/O, 1/l/I),
 * because an administrator reads this aloud or writes it on paper.
 */
function generateTempPassword(length = 12) {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const symbols = '!@#$%&*';
    let out = '';
    for (let i = 0; i < length - 2; i++) {
        out += alphabet[(0, node_crypto_1.randomInt)(alphabet.length)];
    }
    // Guarantee a digit and a symbol so it satisfies any password policy.
    out += String((0, node_crypto_1.randomInt)(10));
    out += symbols[(0, node_crypto_1.randomInt)(symbols.length)];
    return out;
}
function requireAuth(request) {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const role = auth.token.role;
    if (!role)
        throw new https_1.HttpsError('permission-denied', 'Account is not provisioned.');
    if (auth.token.active === false) {
        throw new https_1.HttpsError('permission-denied', 'Account is suspended.');
    }
    return { uid: auth.uid, role };
}
function requireAdmin(request) {
    const caller = requireAuth(request);
    if (caller.role !== 'director' && caller.role !== 'principal') {
        throw new https_1.HttpsError('permission-denied', 'Administrators only.');
    }
    return caller;
}
function requireDirector(request) {
    const caller = requireAuth(request);
    if (caller.role !== 'director') {
        throw new https_1.HttpsError('permission-denied', 'Directors only.');
    }
    return caller;
}
/**
 * Records a privileged action. A school handling minors' records needs a
 * durable trail of who approved, rejected, promoted or published what.
 */
async function writeAudit(entry) {
    await (0, firestore_1.getFirestore)()
        .collection('auditLogs')
        .add({
        ...entry,
        before: entry.before ?? null,
        after: entry.after ?? null,
        at: firestore_1.FieldValue.serverTimestamp(),
    });
}
/** Queues an in-app notification. A trigger fans it out to email/push. */
async function notify(entry) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    await (0, firestore_1.getFirestore)()
        .collection('notifications')
        .add({
        userId: entry.userId,
        type: entry.type,
        title: entry.title,
        body: entry.body,
        icon: null,
        link: entry.link ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        priority: entry.priority ?? 'normal',
        isRead: false,
        readAt: null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        // Backed by a Firestore TTL policy on expiresAt, so no cleanup cron.
        expiresAt: expires,
    });
}
/** Every admin, used when a new application needs attention. */
async function adminUids() {
    const snap = await (0, firestore_1.getFirestore)()
        .collection('users')
        .where('role', 'in', ['director', 'principal'])
        .get();
    return snap.docs.map((doc) => doc.id);
}
//# sourceMappingURL=shared.js.map