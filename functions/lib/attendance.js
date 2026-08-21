"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAttendanceWrite = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const shared_1 = require("./shared");
/**
 * Fans a session's records map out into per-student rows.
 *
 * Attendance is stored as one document per class per Saturday so a teacher
 * marking a whole class is a single atomic write. That shape cannot answer
 * "show me this student's history", so this trigger maintains a denormalized
 * `attendanceEntries` collection and a rolling summary on each student.
 *
 * It DIFFS old against new and writes only what changed, so correcting one
 * student does not rewrite twenty rows.
 */
exports.onAttendanceWrite = (0, firestore_2.onDocumentWritten)({ document: 'attendance/{sessionId}', region: 'us-central1' }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const db = (0, firestore_1.getFirestore)();
    // Deletion: remove the derived rows so history does not show a ghost session.
    if (!after) {
        if (!before)
            return;
        const stale = await db
            .collection('attendanceEntries')
            .where('classId', '==', before.classId)
            .where('sessionDate', '==', before.sessionDate)
            .get();
        const batch = db.batch();
        stale.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        return;
    }
    const beforeRecords = (before?.records ?? {});
    const afterRecords = (after.records ?? {});
    const changed = [];
    for (const [studentId, record] of Object.entries(afterRecords)) {
        const previous = beforeRecords[studentId];
        if (!previous || previous.status !== record.status || previous.note !== record.note) {
            changed.push(studentId);
        }
    }
    const removed = Object.keys(beforeRecords).filter((id) => !(id in afterRecords));
    if (!changed.length && !removed.length)
        return;
    const batch = db.batch();
    for (const studentId of changed) {
        const record = afterRecords[studentId];
        const entryId = `${studentId}_${after.classId}_${after.sessionDate}`;
        batch.set(db.doc(`attendanceEntries/${entryId}`), {
            id: entryId,
            studentId,
            uid: '', // filled below from the student document
            classId: after.classId,
            className: after.className ?? '',
            sessionDate: after.sessionDate,
            schoolYear: after.schoolYear ?? null,
            status: record.status,
            note: record.note ?? null,
            markedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    for (const studentId of removed) {
        batch.delete(db.doc(`attendanceEntries/${studentId}_${after.classId}_${after.sessionDate}`));
    }
    await batch.commit();
    // Backfill each entry's uid so security rules can authorize a student by
    // their own uid without an extra lookup.
    await Promise.all(changed.map(async (studentId) => {
        const studentSnap = await db.doc(`students/${studentId}`).get();
        if (!studentSnap.exists)
            return;
        const uid = studentSnap.data().uid;
        await db
            .doc(`attendanceEntries/${studentId}_${after.classId}_${after.sessionDate}`)
            .update({ uid });
    }));
    // Recompute each affected student's rolling summary from source rows, so a
    // correction cannot leave the totals permanently skewed.
    const affected = [...new Set([...changed, ...removed])];
    await Promise.all(affected.map(async (studentId) => {
        const rows = await db
            .collection('attendanceEntries')
            .where('studentId', '==', studentId)
            .get();
        const summary = { present: 0, absent: 0, late: 0, excused: 0 };
        rows.docs.forEach((doc) => {
            const status = doc.data().status;
            if (status in summary)
                summary[status] += 1;
        });
        await db
            .doc(`students/${studentId}`)
            .update({
            attendanceSummary: {
                ...summary,
                totalSessions: rows.size,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        })
            .catch(() => undefined);
    }));
    // Tell families about a new absence, but only once the sheet is submitted —
    // a teacher mid-edit should not trigger alarms.
    const justSubmitted = before?.status !== 'submitted' && after.status === 'submitted';
    if (!justSubmitted)
        return;
    await Promise.all(Object.entries(afterRecords)
        .filter(([, record]) => record.status === 'absent')
        .map(async ([studentId]) => {
        const studentSnap = await db.doc(`students/${studentId}`).get();
        if (!studentSnap.exists)
            return;
        await (0, shared_1.notify)({
            userId: studentSnap.data().uid,
            type: 'attendance_absent',
            title: 'Absence recorded',
            body: `Marked absent for ${after.className ?? 'class'} on ${after.sessionDate}.`,
            link: '/app/attendance',
            entityType: 'class',
            entityId: after.classId,
            priority: 'high',
        });
    }));
});
//# sourceMappingURL=attendance.js.map