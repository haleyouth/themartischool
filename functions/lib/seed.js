"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoData = void 0;
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
/**
 * ONE-TIME bootstrap: creates the four demo accounts and their sample data.
 *
 * This exists because seeding needs Admin SDK privileges and there is no
 * service-account key on the machine that set the project up. It is gated by a
 * shared secret and refuses to run once the school has real students.
 *
 * DELETE THIS FUNCTION once the demo data is in place:
 *   firebase functions:delete seedDemoData --project themartischool
 */
const SEED_SECRET = 'marti-seed-2026-a7f3d9';
const DEMO_PASSWORD = 'MartiDemo2026!';
const SHADOW_DOMAIN = 'students.themartischool.app';
const SCHOOL_YEAR = 2026;
function studentId(sequence) {
    return `MRT-${SCHOOL_YEAR}-${String(sequence).padStart(4, '0')}`;
}
function shadowEmail(id) {
    return `${id.toLowerCase()}@${SHADOW_DOMAIN}`;
}
function saturdays(from, to) {
    const end = new Date(`${to}T00:00:00`);
    const cursor = new Date(`${from}T00:00:00`);
    const out = [];
    while (cursor.getDay() !== 6)
        cursor.setDate(cursor.getDate() + 1);
    while (cursor <= end) {
        out.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
        cursor.setDate(cursor.getDate() + 7);
    }
    return out;
}
async function upsertUser(email, displayName) {
    const auth = (0, auth_1.getAuth)();
    try {
        const existing = await auth.getUserByEmail(email);
        await auth.updateUser(existing.uid, { password: DEMO_PASSWORD, displayName });
        return existing.uid;
    }
    catch {
        const created = await auth.createUser({
            email,
            password: DEMO_PASSWORD,
            displayName,
            emailVerified: true,
        });
        return created.uid;
    }
}
exports.seedDemoData = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' }, async (request) => {
    if (request.data?.secret !== SEED_SECRET) {
        throw new https_1.HttpsError('permission-denied', 'Invalid seed secret.');
    }
    const db = (0, firestore_1.getFirestore)();
    const auth = (0, auth_1.getAuth)();
    // Refuse to touch a database that already holds non-demo students.
    const existingStudents = await db.collection('students').get();
    const nonDemo = existingStudents.docs.filter((doc) => !(doc.data().registrationId ?? '').startsWith('seed-'));
    if (nonDemo.length > 0) {
        throw new https_1.HttpsError('failed-precondition', `Refusing to seed: ${nonDemo.length} real student record(s) exist.`);
    }
    const log = [];
    /* ── Staff ─────────────────────────────────────────────── */
    const staff = [
        { key: 'director', email: 'director@themartischool.org', name: 'Dr. Emre Yıldız', role: 'director' },
        { key: 'principal', email: 'principal@themartischool.org', name: 'Fatma Şahin', role: 'principal' },
        { key: 'teacher', email: 'teacher@themartischool.org', name: 'Ahmet Demir', role: 'teacher' },
        { key: 'teacher2', email: 'teacher2@themartischool.org', name: 'Zeynep Arslan', role: 'teacher' },
    ];
    const uids = {};
    for (const person of staff) {
        const uid = await upsertUser(person.email, person.name);
        uids[person.key] = uid;
        await db.doc(`users/${uid}`).set({
            uid,
            role: person.role,
            authMethod: 'email',
            studentId: null,
            displayName: person.name,
            email: person.email,
            shadowEmail: null,
            phone: null,
            photoURL: null,
            status: 'active',
            mustChangePassword: false,
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
        }, { merge: true });
    }
    log.push(`${staff.length} staff accounts`);
    /* ── Classes ───────────────────────────────────────────── */
    const sessionDates = saturdays(`${SCHOOL_YEAR}-09-05`, `${SCHOOL_YEAR}-12-19`);
    const classes = [
        {
            id: 'class-foundations',
            name: 'Foundations — Saturday AM',
            subject: 'turkish_language',
            gradeLevels: ['2', '3', '4'],
            startTime: '10:00',
            endTime: '11:15',
            room: 'Room 101',
            teacher: 'teacher',
            capacity: 16,
        },
        {
            id: 'class-builders',
            name: 'Builders — Saturday AM',
            subject: 'turkish_language',
            gradeLevels: ['5', '6', '7'],
            startTime: '10:00',
            endTime: '11:15',
            room: 'Room 102',
            teacher: 'teacher2',
            capacity: 18,
        },
        {
            id: 'class-culture',
            name: 'Culture & Folk Arts',
            subject: 'folk_dance',
            gradeLevels: ['2', '3', '4', '5', '6', '7'],
            startTime: '11:45',
            endTime: '12:45',
            room: 'Main Hall',
            teacher: 'teacher',
            capacity: 24,
        },
    ];
    for (const cls of classes) {
        await db.doc(`classes/${cls.id}`).set({
            id: cls.id,
            name: cls.name,
            subject: cls.subject,
            gradeLevels: cls.gradeLevels,
            schoolYear: SCHOOL_YEAR,
            term: 'fall',
            meetingDay: 6,
            startTime: cls.startTime,
            endTime: cls.endTime,
            timezone: 'America/New_York',
            room: cls.room,
            teacherIds: [uids[cls.teacher]],
            primaryTeacherId: uids[cls.teacher],
            assistantIds: [],
            studentIds: [],
            enrolledCount: 0,
            capacity: cls.capacity,
            sessionDates,
            status: 'active',
            syllabusUrl: null,
            description: `Weekly Saturday class for the ${SCHOOL_YEAR}–${SCHOOL_YEAR + 1} school year.`,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: uids.principal,
        }, { merge: true });
    }
    log.push(`${classes.length} classes`);
    /* ── Students ──────────────────────────────────────────── */
    const students = [
        { first: 'Elif', last: 'Kaya', grade: '3', level: 'beginner', guardian: 'Ayşe Kaya' },
        { first: 'Kerem', last: 'Doğan', grade: '4', level: 'heritage', guardian: 'Murat Doğan' },
        { first: 'Deniz', last: 'Yılmaz', grade: '6', level: 'intermediate', guardian: 'Selin Yılmaz' },
        { first: 'Ada', last: 'Çelik', grade: '5', level: 'beginner', guardian: 'Burak Çelik' },
        { first: 'Mert', last: 'Aydın', grade: '3', level: 'heritage', guardian: 'Esra Aydın' },
        { first: 'Zehra', last: 'Koç', grade: '7', level: 'fluent', guardian: 'Hakan Koç' },
        { first: 'Emir', last: 'Şen', grade: '4', level: 'beginner', guardian: 'Nur Şen' },
        { first: 'Leyla', last: 'Öz', grade: '6', level: 'intermediate', guardian: 'Cem Öz' },
    ];
    const created = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const id = studentId(i + 1);
        const uid = await upsertUser(shadowEmail(id), `${student.first} ${student.last}`);
        const primary = Number(student.grade) <= 4 ? 'class-foundations' : 'class-builders';
        const classIds = [primary, 'class-culture'];
        await db.doc(`users/${uid}`).set({
            uid,
            role: 'student',
            authMethod: 'studentId',
            studentId: id,
            displayName: `${student.first} ${student.last}`,
            email: null,
            shadowEmail: shadowEmail(id),
            phone: null,
            photoURL: null,
            status: 'active',
            mustChangePassword: false,
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
        }, { merge: true });
        await db.doc(`students/${id}`).set({
            studentId: id,
            uid,
            firstName: student.first,
            lastName: student.last,
            preferredName: null,
            dateOfBirth: `${2026 - (5 + Number(student.grade))}-0${(i % 9) + 1}-1${i % 9}`,
            gradeLevel: student.grade,
            turkishLevel: student.level,
            guardianName: student.guardian,
            guardianEmail: `${student.guardian.split(' ')[0].toLowerCase()}@example.com`,
            guardianPhone: `301555${String(1000 + i).slice(-4)}`,
            secondaryGuardian: null,
            emergencyContact: {
                name: student.guardian,
                phone: `301555${String(2000 + i).slice(-4)}`,
                relationship: 'Parent',
            },
            medicalNotes: i === 2 ? 'Mild peanut allergy — carries an EpiPen.' : null,
            photoConsent: i % 3 !== 0,
            guardianUids: [],
            enrollmentStatus: 'active',
            schoolYear: SCHOOL_YEAR,
            registrationId: `seed-${id}`,
            currentClassIds: classIds,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        for (const classId of classIds) {
            await db.doc(`enrollments/${id}_${classId}`).set({
                id: `${id}_${classId}`,
                studentId: id,
                classId,
                uid,
                schoolYear: SCHOOL_YEAR,
                status: 'active',
                enrolledAt: firestore_1.FieldValue.serverTimestamp(),
                enrolledBy: uids.principal,
                droppedAt: null,
            }, { merge: true });
        }
        created.push({ id, uid, classIds });
    }
    log.push(`${created.length} students`);
    for (const cls of classes) {
        const roster = created.filter((s) => s.classIds.includes(cls.id)).map((s) => s.id);
        await db.doc(`classes/${cls.id}`).update({
            studentIds: roster,
            enrolledCount: roster.length,
        });
    }
    /* ── Claims ────────────────────────────────────────────── */
    for (const person of staff) {
        const taught = classes.filter((c) => c.teacher === person.key).map((c) => c.id);
        await auth.setCustomUserClaims(uids[person.key], {
            role: person.role,
            active: true,
            v: 1,
            ...(person.role === 'teacher' ? { classIds: taught } : {}),
        });
    }
    for (const student of created) {
        await auth.setCustomUserClaims(student.uid, {
            role: 'student',
            active: true,
            v: 1,
            studentId: student.id,
            schoolYear: SCHOOL_YEAR,
        });
    }
    log.push('custom claims set');
    /* ── Attendance ────────────────────────────────────────── */
    // Use Saturdays that have actually happened. Early in the school year the
    // scheduled term may not have started yet, so fall back to the six
    // Saturdays before today — otherwise the demo dashboards render empty.
    const today = new Date();
    const scheduledPast = sessionDates.filter((d) => new Date(`${d}T00:00:00`) <= today);
    let past = scheduledPast.slice(-6);
    if (past.length === 0) {
        const cursor = new Date(today);
        while (cursor.getDay() !== 6)
            cursor.setDate(cursor.getDate() - 1);
        const recent = [];
        for (let i = 0; i < 6; i++) {
            recent.unshift(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
            cursor.setDate(cursor.getDate() - 7);
        }
        past = recent;
    }
    for (const cls of classes) {
        const roster = created.filter((s) => s.classIds.includes(cls.id));
        for (let si = 0; si < past.length; si++) {
            const date = past[si];
            const records = {};
            let present = 0;
            let absent = 0;
            let late = 0;
            let excused = 0;
            for (let sti = 0; sti < roster.length; sti++) {
                const seed = (si * 7 + sti * 3) % 20;
                const status = seed === 0 ? 'absent' : seed === 5 ? 'late' : seed === 11 ? 'excused' : 'present';
                if (status === 'present')
                    present++;
                else if (status === 'absent')
                    absent++;
                else if (status === 'late')
                    late++;
                else
                    excused++;
                records[roster[sti].id] = {
                    status,
                    arrivedAt: status === 'late' ? '10:20' : null,
                    note: null,
                    markedBy: uids[cls.teacher],
                    markedAt: new Date(`${date}T10:05:00`),
                };
            }
            const sessionId = `${cls.id}_${date}`;
            await db.doc(`attendance/${sessionId}`).set({
                id: sessionId,
                classId: cls.id,
                className: cls.name,
                sessionDate: date,
                schoolYear: SCHOOL_YEAR,
                term: 'fall',
                records,
                presentCount: present,
                absentCount: absent,
                lateCount: late,
                excusedCount: excused,
                totalStudents: roster.length,
                status: 'submitted',
                takenBy: uids[cls.teacher],
                takenAt: new Date(`${date}T10:05:00`),
                submittedAt: new Date(`${date}T10:10:00`),
                classNotes: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            for (const student of roster) {
                const record = records[student.id];
                const entryId = `${student.id}_${cls.id}_${date}`;
                await db.doc(`attendanceEntries/${entryId}`).set({
                    id: entryId,
                    studentId: student.id,
                    uid: student.uid,
                    classId: cls.id,
                    className: cls.name,
                    sessionDate: date,
                    schoolYear: SCHOOL_YEAR,
                    status: record.status,
                    note: null,
                    markedAt: new Date(`${date}T10:05:00`),
                }, { merge: true });
            }
        }
    }
    log.push(`attendance for ${past.length} sessions x ${classes.length} classes`);
    for (const student of created) {
        const rows = await db.collection('attendanceEntries').where('studentId', '==', student.id).get();
        const summary = { present: 0, absent: 0, late: 0, excused: 0 };
        rows.docs.forEach((doc) => {
            const status = doc.data().status;
            if (status in summary)
                summary[status] += 1;
        });
        await db.doc(`students/${student.id}`).update({
            attendanceSummary: {
                ...summary,
                totalSessions: rows.size,
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            },
        });
    }
    /* ── Reports ───────────────────────────────────────────── */
    const periodEnd = past[past.length - 1] ?? `${SCHOOL_YEAR}-11-01`;
    for (let i = 0; i < created.length; i++) {
        const student = created[i];
        const classId = student.classIds[0];
        const cls = classes.find((c) => c.id === classId);
        const base = 3 + (i % 3);
        const status = i < 6 ? 'published' : 'draft';
        await db.doc(`performanceReports/seed-report-${student.id}`).set({
            id: `seed-report-${student.id}`,
            studentId: student.id,
            uid: student.uid,
            classId,
            className: cls.name,
            teacherId: uids[cls.teacher],
            teacherName: staff.find((s) => s.key === cls.teacher).name,
            schoolYear: SCHOOL_YEAR,
            term: 'fall',
            periodType: 'monthly',
            periodStart: past[0] ?? `${SCHOOL_YEAR}-09-05`,
            periodEnd,
            scores: {
                participation: Math.min(5, base + 1),
                speaking: base,
                reading: Math.min(5, base + 1),
                writing: Math.max(1, base - 1),
                listening: Math.min(5, base + 1),
                behavior: 5,
                homework: base,
            },
            overallGrade: base >= 5 ? 'A' : base >= 4 ? 'B+' : 'B',
            strengths: 'Engages well with class discussion and is quick to help classmates who are stuck.',
            areasForImprovement: 'Written work would benefit from more practice with vowel harmony and suffixes.',
            teacherComments: 'A steady term with real progress in speaking confidence. Reading aloud at home two or three times a week would help consolidate it.',
            recommendedActions: 'Read one short Turkish story aloud together each week.',
            guardianVisible: true,
            status,
            publishedAt: status === 'published' ? firestore_1.FieldValue.serverTimestamp() : null,
            publishedBy: status === 'published' ? uids.principal : null,
            acknowledgedByGuardianAt: null,
            attachments: [],
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    log.push(`${created.length} reports (6 published, 2 draft)`);
    /* ── Pending applications ──────────────────────────────── */
    const applicants = [
        { first: 'Yusuf', last: 'Aksoy', grade: '2', guardian: 'Derya Aksoy', level: 'none' },
        { first: 'Nehir', last: 'Bulut', grade: '5', guardian: 'Onur Bulut', level: 'heritage' },
        { first: 'Aylin', last: 'Erdem', grade: '3', guardian: 'Pınar Erdem', level: 'beginner' },
    ];
    for (let i = 0; i < applicants.length; i++) {
        const a = applicants[i];
        await db.doc(`registrations/seed-app-${i + 1}`).set({
            id: `seed-app-${i + 1}`,
            status: 'pending',
            firstName: a.first,
            lastName: a.last,
            preferredName: null,
            dateOfBirth: `${2026 - (5 + Number(a.grade))}-06-15`,
            gender: null,
            guardianName: a.guardian,
            guardianEmail: `${a.guardian.split(' ')[0].toLowerCase()}@example.com`,
            guardianPhone: `301555${String(3000 + i).slice(-4)}`,
            secondaryGuardian: null,
            address: { line1: `${100 + i} Main Street`, line2: '', city: 'Rockville', state: 'MD', zip: '20850' },
            emergencyContact: {
                name: a.guardian,
                phone: `301555${String(4000 + i).slice(-4)}`,
                relationship: 'Parent',
            },
            medicalNotes: null,
            allergies: null,
            turkishLevel: a.level,
            priorSchooling: null,
            requestedGradeLevel: a.grade,
            howHeardAboutUs: 'friend',
            plan: 'full',
            photoConsent: true,
            termsAcceptedAt: firestore_1.FieldValue.serverTimestamp(),
            schoolYear: SCHOOL_YEAR,
            submittedAt: firestore_1.FieldValue.serverTimestamp(),
            source: 'web',
        }, { merge: true });
    }
    log.push(`${applicants.length} pending registrations`);
    /* ── Conversation + notifications ──────────────────────── */
    const dmId = `dm_${[uids.teacher, uids.principal].sort().join('_')}`;
    await db.doc(`conversations/${dmId}`).set({
        id: dmId,
        type: 'direct',
        title: null,
        participantIds: [uids.teacher, uids.principal],
        participantRoles: { [uids.teacher]: 'teacher', [uids.principal]: 'principal' },
        participantNames: { [uids.teacher]: 'Ahmet Demir', [uids.principal]: 'Fatma Şahin' },
        classId: null,
        createdBy: uids.principal,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        lastMessage: {
            text: 'Thank you — I will have the reports in by Friday.',
            senderId: uids.teacher,
            senderName: 'Ahmet Demir',
            sentAt: firestore_1.FieldValue.serverTimestamp(),
        },
        lastMessageAt: firestore_1.FieldValue.serverTimestamp(),
        unreadCounts: { [uids.teacher]: 0, [uids.principal]: 1 },
        readAt: {},
        isArchived: false,
        isLocked: false,
    }, { merge: true });
    const thread = [
        {
            id: 'm1',
            from: uids.principal,
            name: 'Fatma Şahin',
            role: 'principal',
            text: 'Could you have the monthly reports ready before the parent evening?',
        },
        {
            id: 'm2',
            from: uids.teacher,
            name: 'Ahmet Demir',
            role: 'teacher',
            text: 'Thank you — I will have the reports in by Friday.',
        },
    ];
    for (let i = 0; i < thread.length; i++) {
        const m = thread[i];
        await db.doc(`conversations/${dmId}/messages/${m.id}`).set({
            id: m.id,
            conversationId: dmId,
            senderId: m.from,
            senderName: m.name,
            senderRole: m.role,
            text: m.text,
            attachments: [],
            sentAt: new Date(Date.now() - (thread.length - i) * 3600_000),
            editedAt: null,
            deletedAt: null,
            readBy: [m.from],
        }, { merge: true });
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    const notifications = [
        {
            uid: uids.principal,
            title: 'New registrations waiting',
            body: `${applicants.length} applications are ready for review.`,
            link: '/app/registrations',
            type: 'registration_submitted',
        },
        {
            uid: uids.director,
            title: 'Term underway',
            body: 'Attendance is being recorded across all three Saturday classes.',
            link: '/app',
            type: 'system',
        },
        {
            uid: uids.teacher,
            title: 'Reports due',
            body: 'Monthly progress reports are due before the parent evening.',
            link: '/app/reports',
            type: 'system',
        },
        {
            uid: created[0].uid,
            title: 'New progress report',
            body: 'Your Foundations report has been published.',
            link: '/app/reports',
            type: 'report_published',
        },
    ];
    for (let i = 0; i < notifications.length; i++) {
        const n = notifications[i];
        await db.doc(`notifications/seed-notif-${i + 1}`).set({
            id: `seed-notif-${i + 1}`,
            userId: n.uid,
            type: n.type,
            title: n.title,
            body: n.body,
            icon: null,
            link: n.link,
            entityType: null,
            entityId: null,
            priority: 'normal',
            isRead: false,
            readAt: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: expires,
        }, { merge: true });
    }
    log.push(`${notifications.length} notifications`);
    // Keep the counter ahead of the seeded IDs so real approvals continue on.
    await db.doc(`counters/studentId_${SCHOOL_YEAR}`).set({ value: created.length, schoolYear: SCHOOL_YEAR, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, log, demoStudentId: studentId(1) };
});
//# sourceMappingURL=seed.js.map