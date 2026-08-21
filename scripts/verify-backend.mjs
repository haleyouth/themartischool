/**
 * End to end verification of every backend flow against the LIVE project.
 *
 * This exercises real Firebase Auth sessions, real Firestore reads and writes,
 * and real Cloud Functions, so it proves the security rules and the callables
 * agree with each other. It asserts the DENY cases as hard as the allow cases,
 * because a backend that only proves the happy path is how data leaks.
 *
 * Run with: node scripts/verify-backend.mjs
 */
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const app = initializeApp({
  apiKey: 'AIzaSyBOm4JnIIVXJg3oTf_19YO3E-E8DMMX3fM',
  authDomain: 'themartischool.firebaseapp.com',
  projectId: 'themartischool',
  appId: '1:1049206868099:web:bb86ca297862efe8ca73b6',
})

const auth = getAuth(app)
const db = getFirestore(app)
const fns = getFunctions(app)

const PASSWORD = 'MartiDemo2026!'
const ACCOUNTS = {
  director: 'director@themartischool.org',
  principal: 'principal@themartischool.org',
  teacher: 'teacher@themartischool.org',
  student: 'mrt-2026-0001@students.themartischool.app',
}

let pass = 0
let fail = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    pass++
    console.log(`   ok   ${name}`)
  } else {
    fail++
    failures.push(name)
    console.log(`   FAIL ${name} ${detail}`)
  }
}

/** Asserts an operation is rejected. A silent success here is a real leak. */
async function denied(name, operation) {
  try {
    await operation()
    check(name, false, '(was ALLOWED, expected denial)')
  } catch (error) {
    const code = error?.code ?? ''
    const isAuthz =
      code.includes('permission-denied') ||
      code.includes('unauthenticated') ||
      code === 'permission-denied'
    check(name, isAuthz, isAuthz ? '' : `(denied for the wrong reason: ${code})`)
  }
}

async function allowed(name, operation) {
  try {
    const result = await operation()
    check(name, true)
    return result
  } catch (error) {
    check(name, false, `(${error?.code ?? error?.message})`)
    return null
  }
}

async function signInAs(role) {
  await signOut(auth)
  const cred = await signInWithEmailAndPassword(auth, ACCOUNTS[role], PASSWORD)
  const token = await cred.user.getIdTokenResult()
  return { uid: cred.user.uid, claims: token.claims }
}

function section(title) {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
}

console.log('BACKEND VERIFICATION against the live project')
console.log('='.repeat(60))

/* 1. Authentication and sessions */
section('1. Authentication, sessions and sign out')

for (const role of ['director', 'principal', 'teacher', 'student']) {
  const { claims } = await signInAs(role)
  check(`sign in as ${role} carries role=${role}`, claims.role === role, `got ${claims.role}`)
  check(`  ${role} account is active`, claims.active === true)
}

// Student claims must carry the student ID that scopes their reads.
const studentSession = await signInAs('student')
check(
  'student token carries its studentId claim',
  studentSession.claims.studentId === 'MRT-2026-0001',
  `got ${studentSession.claims.studentId}`,
)
// Teacher claims must carry class ids, or rules cannot scope them.
const teacherSession = await signInAs('teacher')
check(
  'teacher token carries classIds',
  Array.isArray(teacherSession.claims.classIds) && teacherSession.claims.classIds.length > 0,
  `got ${JSON.stringify(teacherSession.claims.classIds)}`,
)

await signOut(auth)
check('sign out clears the session', auth.currentUser === null)

// A signed out visitor must not read anything private.
await denied('signed out user cannot read students', () =>
  getDocs(query(collection(db, 'students'), limit(1))),
)
await denied('signed out user cannot read registrations', () =>
  getDocs(query(collection(db, 'registrations'), limit(1))),
)

await signInWithEmailAndPassword(auth, ACCOUNTS.director, PASSWORD)
check('can sign back in after signing out', auth.currentUser !== null)

/* 2. Registration intake */
section('2. Registration intake and approval')

await signOut(auth)
const application = await allowed('public can submit a registration', () =>
  addDoc(collection(db, 'registrations'), {
    status: 'pending',
    source: 'web',
    submittedAt: serverTimestamp(),
    termsAcceptedAt: serverTimestamp(),
    schoolYear: 2026,
    firstName: 'Verify',
    lastName: 'Runner',
    dateOfBirth: '2016-05-04',
    guardianName: 'Verification Script',
    guardianEmail: 'verify@example.com',
    guardianPhone: '4105550100',
    requestedGradeLevel: '4',
    turkishLevel: 'beginner',
    emergencyContact: { name: 'Backup', phone: '4105550101', relationship: 'Aunt' },
    photoConsent: false,
  }),
)

await denied('public cannot read back registrations', () =>
  getDocs(query(collection(db, 'registrations'), limit(1))),
)
await denied('public cannot self-approve a registration', () =>
  addDoc(collection(db, 'registrations'), {
    status: 'approved',
    source: 'web',
    submittedAt: serverTimestamp(),
    termsAcceptedAt: serverTimestamp(),
    schoolYear: 2026,
    firstName: 'Sneaky',
    lastName: 'Runner',
    dateOfBirth: '2016-05-04',
    guardianName: 'X',
    guardianEmail: 'x@example.com',
    guardianPhone: '4105550100',
    requestedGradeLevel: '4',
    turkishLevel: 'beginner',
    emergencyContact: { name: 'B', phone: '4105550101', relationship: 'Aunt' },
    photoConsent: false,
  }),
)

await signInAs('principal')
await allowed('principal can list registrations', () =>
  getDocs(query(collection(db, 'registrations'), orderBy('submittedAt', 'desc'), limit(10))),
)

await signInAs('teacher')
await denied('teacher cannot read registrations', () =>
  getDocs(query(collection(db, 'registrations'), limit(1))),
)

/* 3. Account creation and management */
section('3. Account creation and management')

await signInAs('director')
const created = await allowed('director can create a staff account', () =>
  httpsCallable(
    fns,
    'createStaffUser',
  )({
    email: `verify.teacher.${Date.now()}@themartischool.org`,
    displayName: 'Verification Teacher',
    role: 'teacher',
  }),
)
if (created?.data) {
  check('  new staff account returns a uid', typeof created.data.uid === 'string')
}

await signInAs('principal')
await denied('principal cannot create staff accounts', () =>
  httpsCallable(
    fns,
    'createStaffUser',
  )({ email: `nope.${Date.now()}@themartischool.org`, displayName: 'Nope', role: 'teacher' }),
)
await denied('principal cannot change a role', () =>
  httpsCallable(fns, 'setUserRole')({ uid: 'anything', role: 'director' }),
)
await allowed('principal can reset a student password', () =>
  httpsCallable(fns, 'adminResetStudentPassword')({ studentId: 'MRT-2026-0008' }),
)

await signInAs('teacher')
await denied('teacher cannot list accounts', () =>
  getDocs(query(collection(db, 'users'), limit(5))),
)
await denied('teacher cannot suspend an account', () =>
  httpsCallable(fns, 'setUserStatus')({ uid: 'anything', status: 'suspended' }),
)

await signInAs('student')
await denied('student cannot promote themselves', () =>
  updateDoc(doc(db, 'users', studentSession.uid), { role: 'director' }),
)

/* 4. Class schedules */
section('4. Classes and schedules')

await signInAs('teacher')
const teacherClasses = await allowed('teacher can read classes', () =>
  getDocs(query(collection(db, 'classes'), limit(20))),
)

let sampleClassId = null
let foreignClassId = null
if (teacherClasses) {
  const mine = new Set(teacherSession.claims.classIds ?? [])
  for (const snap of teacherClasses.docs) {
    if (mine.has(snap.id)) sampleClassId ??= snap.id
    else foreignClassId ??= snap.id
  }
  check('teacher has at least one assigned class', sampleClassId !== null)

  const withSaturday = teacherClasses.docs.filter((d) => d.data().meetingDay === 6)
  check(
    'every class is scheduled on a Saturday',
    withSaturday.length === teacherClasses.docs.length,
    `${withSaturday.length}/${teacherClasses.docs.length}`,
  )

  const withSessions = teacherClasses.docs.filter((d) => (d.data().sessionDates ?? []).length > 0)
  check('classes carry generated session dates', withSessions.length > 0)
}

await signInAs('principal')
await allowed('principal can read the enrollment roster', () =>
  getDocs(query(collection(db, 'enrollments'), limit(20))),
)

/* 5. Attendance, taken by a teacher, visible to admins */
section('5. Attendance by teacher, visible to principal and director')

await signInAs('teacher')
const sessionDate = '2026-09-12'
if (sampleClassId) {
  await allowed('teacher can take attendance for their own class', () =>
    setDoc(
      doc(db, 'attendance', `${sampleClassId}_${sessionDate}`),
      {
        id: `${sampleClassId}_${sessionDate}`,
        classId: sampleClassId,
        sessionDate,
        schoolYear: 2026,
        term: 'fall',
        records: {
          'MRT-2026-0001': { status: 'present', markedBy: teacherSession.uid, markedAt: new Date() },
        },
        presentCount: 1,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        totalStudents: 1,
        status: 'submitted',
        takenBy: teacherSession.uid,
        takenAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  )
}

if (foreignClassId) {
  await denied('teacher cannot take attendance for another class', () =>
    setDoc(doc(db, 'attendance', `${foreignClassId}_${sessionDate}`), {
      id: `${foreignClassId}_${sessionDate}`,
      classId: foreignClassId,
      sessionDate,
      records: {},
      status: 'draft',
      takenBy: teacherSession.uid,
      takenAt: serverTimestamp(),
    }),
  )
} else {
  console.log('   skip teacher cannot take attendance for another class (no second class seeded)')
}

// The fan out trigger turns the session map into per student rows.
await new Promise((resolve) => setTimeout(resolve, 6000))
await signInAs('principal')
const entries = await allowed('principal can read attendance history', () =>
  getDocs(
    query(
      collection(db, 'attendanceEntries'),
      where('studentId', '==', 'MRT-2026-0001'),
      orderBy('sessionDate', 'desc'),
      limit(20),
    ),
  ),
)
check(
  'the attendance fan out trigger produced student rows',
  (entries?.size ?? 0) > 0,
  `${entries?.size ?? 0} rows`,
)

const summarySnap = await getDoc(doc(db, 'students', 'MRT-2026-0001'))
check(
  'student attendance summary is maintained by the trigger',
  Boolean(summarySnap.data()?.attendanceSummary?.totalSessions),
)

await signInAs('director')
await allowed('director can read attendance too', () =>
  getDocs(query(collection(db, 'attendance'), limit(5))),
)

await signInAs('student')
await allowed('student can read their own attendance history', () =>
  getDocs(
    query(
      collection(db, 'attendanceEntries'),
      where('studentId', '==', 'MRT-2026-0001'),
      limit(20),
    ),
  ),
)
await denied('student cannot read another student attendance', () =>
  getDocs(
    query(
      collection(db, 'attendanceEntries'),
      where('studentId', '==', 'MRT-2026-0002'),
      limit(20),
    ),
  ),
)
await denied('student cannot edit an attendance sheet', () =>
  updateDoc(doc(db, 'attendance', `${sampleClassId}_${sessionDate}`), { status: 'draft' }),
)

/* 6. Performance reports */
section('6. Reports written by teacher, published by admin')

await signInAs('teacher')
const report = await allowed('teacher can write a draft report', () =>
  addDoc(collection(db, 'performanceReports'), {
    studentId: 'MRT-2026-0001',
    uid: 'PLACEHOLDER',
    classId: sampleClassId,
    className: 'Verification Class',
    teacherId: teacherSession.uid,
    teacherName: 'Verification',
    schoolYear: 2026,
    term: 'fall',
    periodType: 'monthly',
    periodStart: '2026-09-05',
    periodEnd: sessionDate,
    scores: {
      participation: 4,
      speaking: 4,
      reading: 3,
      writing: 3,
      listening: 4,
      behavior: 5,
      homework: 4,
    },
    overallGrade: 'B+',
    strengths: 'Verification run.',
    areasForImprovement: 'Verification run.',
    teacherComments: 'Written by the backend verification script.',
    recommendedActions: null,
    guardianVisible: true,
    status: 'draft',
    publishedAt: null,
    publishedBy: null,
    acknowledgedByGuardianAt: null,
    attachments: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }),
)

await denied('teacher cannot publish their own report', () =>
  httpsCallable(fns, 'publishPerformanceReport')({ reportId: report?.id ?? 'x' }),
)

await signInAs('student')
await denied('student cannot read draft reports', () =>
  getDocs(
    query(
      collection(db, 'performanceReports'),
      where('uid', '==', studentSession.uid),
      limit(20),
    ),
  ),
)
await allowed('student can read their own published reports', () =>
  getDocs(
    query(
      collection(db, 'performanceReports'),
      where('uid', '==', studentSession.uid),
      where('status', '==', 'published'),
      limit(20),
    ),
  ),
)

await signInAs('principal')
await allowed('principal can see reports across the school', () =>
  getDocs(query(collection(db, 'performanceReports'), limit(20))),
)

/* 7. Messaging */
section('7. Messaging and notifications')

await signInAs('teacher')
const conversations = await allowed('teacher can list their conversations', () =>
  getDocs(
    query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', teacherSession.uid),
      orderBy('lastMessageAt', 'desc'),
      limit(10),
    ),
  ),
)

const threadId = conversations?.docs?.[0]?.id
if (threadId) {
  await allowed('teacher can post a message into their thread', () =>
    addDoc(collection(db, 'conversations', threadId, 'messages'), {
      conversationId: threadId,
      senderId: teacherSession.uid,
      senderName: 'Verification',
      senderRole: 'teacher',
      text: 'Backend verification message.',
      attachments: [],
      sentAt: serverTimestamp(),
      editedAt: null,
      deletedAt: null,
      readBy: [teacherSession.uid],
    }),
  )

  // Give onMessageCreate time to update the thread and fan out notifications.
  await new Promise((resolve) => setTimeout(resolve, 6000))
  const thread = await getDoc(doc(db, 'conversations', threadId))
  check(
    'the message trigger updated the thread preview',
    thread.data()?.lastMessage?.text?.includes('verification'),
  )
} else {
  console.log('   skip messaging writes (no seeded conversation for this teacher)')
}

await denied('a user cannot list conversations they are not in', () =>
  getDocs(
    query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', 'someone-else'),
      limit(5),
    ),
  ),
)

await signInAs('student')
await allowed('student can read their own notifications', () =>
  getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', studentSession.uid),
      orderBy('createdAt', 'desc'),
      limit(10),
    ),
  ),
)
await denied('student cannot list all notifications', () =>
  getDocs(query(collection(db, 'notifications'), limit(10))),
)
await denied('student cannot forge a notification', () =>
  addDoc(collection(db, 'notifications'), {
    userId: studentSession.uid,
    title: 'Forged',
    body: 'Should not be allowed',
    isRead: false,
    createdAt: serverTimestamp(),
  }),
)

/* 8. Server only collections */
section('8. Server only collections')

await signInAs('director')
await denied('nobody can read the student ID counter', () =>
  getDoc(doc(db, 'counters', 'studentId_2026')),
)
await denied('nobody can write audit logs from the client', () =>
  addDoc(collection(db, 'auditLogs'), { action: 'forged', actorUid: 'x', at: serverTimestamp() }),
)
await allowed('director can read audit logs', () =>
  getDocs(query(collection(db, 'auditLogs'), orderBy('at', 'desc'), limit(5))),
)

await signInAs('principal')
await denied('principal cannot read audit logs', () =>
  getDocs(query(collection(db, 'auditLogs'), limit(5))),
)

await signOut(auth)

console.log('\n' + '='.repeat(60))
console.log(`${pass} passed, ${fail} failed`)
if (failures.length) {
  console.log('\nFailures:')
  for (const name of failures) console.log(`  - ${name}`)
}
process.exit(fail === 0 ? 0 : 1)
