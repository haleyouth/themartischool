/**
 * Seeds The Marti School with the four demo accounts and enough realistic data
 * that every dashboard has something to show on first load.
 *
 * Idempotent: re-running updates in place rather than duplicating.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/seed.ts
 *
 * The demo credentials are public by design, so everything created here is
 * fictional. Never attach a real student record to a demo account.
 */
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { existsSync, readFileSync } from 'node:fs'

const PROJECT_ID = 'themartischool'
const DEMO_PASSWORD = 'MartiDemo2026!'
const SHADOW_DOMAIN = 'students.themartischool.app'

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccountKey.json'
initializeApp({
  projectId: PROJECT_ID,
  credential: existsSync(keyPath)
    ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
    : applicationDefault(),
})

const auth = getAuth()
const db = getFirestore()

const SCHOOL_YEAR = 2026

function studentId(sequence: number) {
  return `MRT-${SCHOOL_YEAR}-${String(sequence).padStart(4, '0')}`
}

function shadowEmail(id: string) {
  return `${id.toLowerCase()}@${SHADOW_DOMAIN}`
}

/** Every Saturday between two dates. */
function saturdays(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  const out: string[] = []
  const cursor = new Date(start)
  while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() + 1)
  while (cursor <= end) {
    out.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
        cursor.getDate(),
      ).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 7)
  }
  return out
}

/** Creates the Auth user if absent, otherwise resets it to a known state. */
async function upsertUser(email: string, password: string, displayName: string) {
  try {
    const existing = await auth.getUserByEmail(email)
    await auth.updateUser(existing.uid, { password, displayName })
    return existing.uid
  } catch {
    const created = await auth.createUser({ email, password, displayName, emailVerified: true })
    return created.uid
  }
}

async function main() {
  console.log(`Seeding ${PROJECT_ID}…\n`)

  /* ── Staff ───────────────────────────────────────────────── */

  const staff = [
    {
      key: 'director',
      email: 'director@themartischool.org',
      name: 'Dr. Emre Yıldız',
      role: 'director' as const,
    },
    {
      key: 'principal',
      email: 'principal@themartischool.org',
      name: 'Fatma Şahin',
      role: 'principal' as const,
    },
    {
      key: 'teacher',
      email: 'teacher@themartischool.org',
      name: 'Ahmet Demir',
      role: 'teacher' as const,
    },
    {
      key: 'teacher2',
      email: 'teacher2@themartischool.org',
      name: 'Zeynep Arslan',
      role: 'teacher' as const,
    },
  ]

  const uids: Record<string, string> = {}

  for (const person of staff) {
    const uid = await upsertUser(person.email, DEMO_PASSWORD, person.name)
    uids[person.key] = uid
    await db.doc(`users/${uid}`).set(
      {
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: null,
      },
      { merge: true },
    )
    console.log(`  staff  ${person.role.padEnd(9)} ${person.email}`)
  }

  /* ── Classes ─────────────────────────────────────────────── */

  const sessionDates = saturdays(`${SCHOOL_YEAR}-09-05`, `${SCHOOL_YEAR}-12-19`)

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
  ]

  for (const cls of classes) {
    await db.doc(`classes/${cls.id}`).set(
      {
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
        description: `Weekly Saturday ${cls.subject.replace('_', ' ')} class for the ${SCHOOL_YEAR}–${SCHOOL_YEAR + 1} year.`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: uids.principal,
      },
      { merge: true },
    )
    console.log(`  class  ${cls.name}`)
  }

  /* ── Students ────────────────────────────────────────────── */

  const students = [
    { first: 'Elif', last: 'Kaya', grade: '3', level: 'beginner', guardian: 'Ayşe Kaya' },
    { first: 'Kerem', last: 'Doğan', grade: '4', level: 'heritage', guardian: 'Murat Doğan' },
    { first: 'Deniz', last: 'Yılmaz', grade: '6', level: 'intermediate', guardian: 'Selin Yılmaz' },
    { first: 'Ada', last: 'Çelik', grade: '5', level: 'beginner', guardian: 'Burak Çelik' },
    { first: 'Mert', last: 'Aydın', grade: '3', level: 'heritage', guardian: 'Esra Aydın' },
    { first: 'Zehra', last: 'Koç', grade: '7', level: 'fluent', guardian: 'Hakan Koç' },
    { first: 'Emir', last: 'Şen', grade: '4', level: 'beginner', guardian: 'Nur Şen' },
    { first: 'Leyla', last: 'Öz', grade: '6', level: 'intermediate', guardian: 'Cem Öz' },
  ]

  const created: { id: string; uid: string; classIds: string[] }[] = []

  for (const [index, student] of students.entries()) {
    const id = studentId(index + 1)
    const uid = await upsertUser(
      shadowEmail(id),
      DEMO_PASSWORD,
      `${student.first} ${student.last}`,
    )

    // Younger grades go to Foundations, older to Builders; everyone does Culture.
    const primary = Number(student.grade) <= 4 ? 'class-foundations' : 'class-builders'
    const classIds = [primary, 'class-culture']

    await db.doc(`users/${uid}`).set(
      {
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: null,
      },
      { merge: true },
    )

    await db.doc(`students/${id}`).set(
      {
        studentId: id,
        uid,
        firstName: student.first,
        lastName: student.last,
        preferredName: null,
        dateOfBirth: `${2026 - (5 + Number(student.grade))}-0${(index % 9) + 1}-1${index % 9}`,
        gradeLevel: student.grade,
        turkishLevel: student.level,
        guardianName: student.guardian,
        guardianEmail: `${student.guardian.split(' ')[0].toLowerCase()}@example.com`,
        guardianPhone: `301555${String(1000 + index).slice(-4)}`,
        secondaryGuardian: null,
        emergencyContact: {
          name: student.guardian,
          phone: `301555${String(2000 + index).slice(-4)}`,
          relationship: 'Parent',
        },
        medicalNotes: index === 2 ? 'Mild peanut allergy — carries an EpiPen.' : null,
        photoConsent: index % 3 !== 0,
        guardianUids: [],
        enrollmentStatus: 'active',
        schoolYear: SCHOOL_YEAR,
        registrationId: `seed-${id}`,
        currentClassIds: classIds,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    for (const classId of classIds) {
      await db.doc(`enrollments/${id}_${classId}`).set(
        {
          id: `${id}_${classId}`,
          studentId: id,
          classId,
          uid,
          schoolYear: SCHOOL_YEAR,
          status: 'active',
          enrolledAt: FieldValue.serverTimestamp(),
          enrolledBy: uids.principal,
          droppedAt: null,
        },
        { merge: true },
      )
    }

    created.push({ id, uid, classIds })
    console.log(`  student ${id}  ${student.first} ${student.last}`)
  }

  // Refresh denormalized rosters now that enrollments exist.
  for (const cls of classes) {
    const roster = created.filter((s) => s.classIds.includes(cls.id)).map((s) => s.id)
    await db.doc(`classes/${cls.id}`).update({
      studentIds: roster,
      enrolledCount: roster.length,
    })
  }

  /* ── Custom claims ───────────────────────────────────────── */

  for (const person of staff) {
    const uid = uids[person.key]
    const taught = classes.filter((c) => c.teacher === person.key).map((c) => c.id)
    await auth.setCustomUserClaims(uid, {
      role: person.role,
      active: true,
      v: 1,
      ...(person.role === 'teacher' ? { classIds: taught } : {}),
    })
  }

  for (const student of created) {
    await auth.setCustomUserClaims(student.uid, {
      role: 'student',
      active: true,
      v: 1,
      studentId: student.id,
      schoolYear: SCHOOL_YEAR,
    })
  }
  console.log('\n  claims set for all accounts')

  /* ── Attendance for past Saturdays ───────────────────────── */

  // Use Saturdays that have actually happened. If the scheduled term has not
  // started yet, fall back to the six Saturdays before today so the demo
  // dashboards are not empty.
  const today = new Date()
  const scheduledPast = sessionDates.filter((date) => new Date(`${date}T00:00:00`) <= today)

  let pastSessions = scheduledPast.slice(-6)
  if (pastSessions.length === 0) {
    const cursor = new Date(today)
    while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() - 1)
    const recent: string[] = []
    for (let i = 0; i < 6; i++) {
      recent.unshift(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
          cursor.getDate(),
        ).padStart(2, '0')}`,
      )
      cursor.setDate(cursor.getDate() - 7)
    }
    pastSessions = recent
  }

  for (const cls of classes) {
    const roster = created.filter((s) => s.classIds.includes(cls.id))

    for (const [sessionIndex, date] of pastSessions.entries()) {
      const records: Record<string, unknown> = {}
      let present = 0
      let absent = 0
      let late = 0
      let excused = 0

      for (const [studentIndex, student] of roster.entries()) {
        // Deterministic spread so the demo shows a believable mix.
        const seed = (sessionIndex * 7 + studentIndex * 3) % 20
        const status =
          seed === 0 ? 'absent' : seed === 5 ? 'late' : seed === 11 ? 'excused' : 'present'

        if (status === 'present') present++
        else if (status === 'absent') absent++
        else if (status === 'late') late++
        else excused++

        records[student.id] = {
          status,
          arrivedAt: status === 'late' ? '10:20' : null,
          note: null,
          markedBy: uids[cls.teacher],
          markedAt: new Date(`${date}T10:05:00`),
        }
      }

      const sessionId = `${cls.id}_${date}`
      await db.doc(`attendance/${sessionId}`).set(
        {
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
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      // Write the derived rows directly: in a fresh project the trigger may not
      // be deployed yet, and the dashboards read from this collection.
      for (const student of roster) {
        const record = records[student.id] as { status: string }
        const entryId = `${student.id}_${cls.id}_${date}`
        await db.doc(`attendanceEntries/${entryId}`).set(
          {
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
          },
          { merge: true },
        )
      }
    }
  }
  console.log(`  attendance for ${pastSessions.length} sessions across ${classes.length} classes`)

  // Rolling summaries.
  for (const student of created) {
    const rows = await db
      .collection('attendanceEntries')
      .where('studentId', '==', student.id)
      .get()
    const summary = { present: 0, absent: 0, late: 0, excused: 0 }
    rows.docs.forEach((doc) => {
      const status = doc.data().status as keyof typeof summary
      if (status in summary) summary[status] += 1
    })
    await db.doc(`students/${student.id}`).update({
      attendanceSummary: {
        ...summary,
        totalSessions: rows.size,
        lastUpdated: FieldValue.serverTimestamp(),
      },
    })
  }
  console.log('  attendance summaries computed')

  /* ── Performance reports ─────────────────────────────────── */

  const periodEnd = pastSessions[pastSessions.length - 1] ?? `${SCHOOL_YEAR}-11-01`

  for (const [index, student] of created.entries()) {
    const classId = student.classIds[0]
    const cls = classes.find((c) => c.id === classId)!
    const base = 3 + (index % 3)

    const scores = {
      participation: Math.min(5, base + 1),
      speaking: base,
      reading: Math.min(5, base + 1),
      writing: Math.max(1, base - 1),
      listening: Math.min(5, base + 1),
      behavior: 5,
      homework: base,
    }

    // Most are published; leave a couple as drafts so the publish flow is
    // visible in the demo, and so the "students cannot see drafts" rule is
    // exercised with real data.
    const status = index < 6 ? 'published' : 'draft'

    await db.doc(`performanceReports/seed-report-${student.id}`).set(
      {
        id: `seed-report-${student.id}`,
        studentId: student.id,
        uid: student.uid,
        classId,
        className: cls.name,
        teacherId: uids[cls.teacher],
        teacherName: staff.find((s) => s.key === cls.teacher)!.name,
        schoolYear: SCHOOL_YEAR,
        term: 'fall',
        periodType: 'monthly',
        periodStart: pastSessions[0] ?? `${SCHOOL_YEAR}-09-05`,
        periodEnd,
        scores,
        overallGrade: base >= 5 ? 'A' : base >= 4 ? 'B+' : 'B',
        strengths:
          'Engages well with class discussion and is quick to help classmates who are stuck.',
        areasForImprovement:
          'Written work would benefit from more practice with vowel harmony and suffixes.',
        teacherComments:
          'A steady term with real progress in speaking confidence. Reading aloud at home two or three times a week would help consolidate it.',
        recommendedActions: 'Read one short Turkish story aloud together each week.',
        guardianVisible: true,
        status,
        publishedAt: status === 'published' ? FieldValue.serverTimestamp() : null,
        publishedBy: status === 'published' ? uids.principal : null,
        acknowledgedByGuardianAt: null,
        attachments: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }
  console.log(`  ${created.length} performance reports (6 published, rest draft)`)

  /* ── Pending registrations to review ─────────────────────── */

  const applicants = [
    { first: 'Yusuf', last: 'Aksoy', grade: '2', guardian: 'Derya Aksoy', level: 'none' },
    { first: 'Nehir', last: 'Bulut', grade: '5', guardian: 'Onur Bulut', level: 'heritage' },
    { first: 'Aylin', last: 'Erdem', grade: '3', guardian: 'Pınar Erdem', level: 'beginner' },
  ]

  for (const [index, applicant] of applicants.entries()) {
    await db.doc(`registrations/seed-app-${index + 1}`).set(
      {
        id: `seed-app-${index + 1}`,
        status: 'pending',
        firstName: applicant.first,
        lastName: applicant.last,
        preferredName: null,
        dateOfBirth: `${2026 - (5 + Number(applicant.grade))}-06-15`,
        gender: null,
        guardianName: applicant.guardian,
        guardianEmail: `${applicant.guardian.split(' ')[0].toLowerCase()}@example.com`,
        guardianPhone: `301555${String(3000 + index).slice(-4)}`,
        secondaryGuardian: null,
        address: {
          line1: `${100 + index} Main Street`,
          line2: '',
          city: 'Rockville',
          state: 'MD',
          zip: '20850',
        },
        emergencyContact: {
          name: applicant.guardian,
          phone: `301555${String(4000 + index).slice(-4)}`,
          relationship: 'Parent',
        },
        medicalNotes: null,
        allergies: null,
        turkishLevel: applicant.level,
        priorSchooling: null,
        requestedGradeLevel: applicant.grade,
        howHeardAboutUs: 'friend',
        plan: 'full',
        photoConsent: true,
        termsAcceptedAt: FieldValue.serverTimestamp(),
        schoolYear: SCHOOL_YEAR,
        submittedAt: FieldValue.serverTimestamp(),
        source: 'web',
      },
      { merge: true },
    )
  }
  console.log(`  ${applicants.length} pending registrations`)

  /* ── Conversations and notifications ─────────────────────── */

  const dmId = `dm_${[uids.teacher, uids.principal].sort().join('_')}`
  await db.doc(`conversations/${dmId}`).set(
    {
      id: dmId,
      type: 'direct',
      title: null,
      participantIds: [uids.teacher, uids.principal],
      participantRoles: { [uids.teacher]: 'teacher', [uids.principal]: 'principal' },
      participantNames: { [uids.teacher]: 'Ahmet Demir', [uids.principal]: 'Fatma Şahin' },
      classId: null,
      createdBy: uids.principal,
      createdAt: FieldValue.serverTimestamp(),
      lastMessage: {
        text: 'Thank you — I will have the reports in by Friday.',
        senderId: uids.teacher,
        senderName: 'Ahmet Demir',
        sentAt: FieldValue.serverTimestamp(),
      },
      lastMessageAt: FieldValue.serverTimestamp(),
      unreadCounts: { [uids.teacher]: 0, [uids.principal]: 1 },
      readAt: {},
      isArchived: false,
      isLocked: false,
    },
    { merge: true },
  )

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
  ]

  for (const [index, message] of thread.entries()) {
    await db.doc(`conversations/${dmId}/messages/${message.id}`).set(
      {
        id: message.id,
        conversationId: dmId,
        senderId: message.from,
        senderName: message.name,
        senderRole: message.role,
        text: message.text,
        attachments: [],
        sentAt: new Date(Date.now() - (thread.length - index) * 3600_000),
        editedAt: null,
        deletedAt: null,
        readBy: [message.from],
      },
      { merge: true },
    )
  }
  console.log('  seeded a staff conversation')

  const expires = new Date()
  expires.setDate(expires.getDate() + 90)

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
  ]

  for (const [index, item] of notifications.entries()) {
    await db.doc(`notifications/seed-notif-${index + 1}`).set(
      {
        id: `seed-notif-${index + 1}`,
        userId: item.uid,
        type: item.type,
        title: item.title,
        body: item.body,
        icon: null,
        link: item.link,
        entityType: null,
        entityId: null,
        priority: 'normal',
        isRead: false,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: expires,
      },
      { merge: true },
    )
  }
  console.log(`  ${notifications.length} notifications`)

  /* ── Counter, so real approvals continue the sequence ────── */

  await db.doc(`counters/studentId_${SCHOOL_YEAR}`).set(
    { value: created.length, schoolYear: SCHOOL_YEAR, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )

  console.log('\nDone. Demo sign-ins:')
  console.log(`  Director   director@themartischool.org   / ${DEMO_PASSWORD}`)
  console.log(`  Principal  principal@themartischool.org  / ${DEMO_PASSWORD}`)
  console.log(`  Teacher    teacher@themartischool.org    / ${DEMO_PASSWORD}`)
  console.log(`  Student    ${studentId(1)}                 / ${DEMO_PASSWORD}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exit(1)
  })
