import type { Timestamp } from 'firebase/firestore'

export type Role = 'director' | 'principal' | 'teacher' | 'student'

export const ROLES: Role[] = ['director', 'principal', 'teacher', 'student']

/** Custom claims minted by Cloud Functions. Kept small — under the 1000-byte budget. */
export interface MartiClaims {
  role: Role
  active: boolean
  /** Claims version. The client compares this to users/{uid}.claimsVersion to detect staleness. */
  v: number
  studentId?: string
  schoolYear?: number
  /** Teachers only — the classes they teach, so rules avoid unbounded get() calls. */
  classIds?: string[]
}

export type Locale = 'en' | 'tr'

export interface NotificationPrefs {
  email: boolean
  inApp: boolean
  attendanceAlerts: boolean
  reportPublished: boolean
  newMessage: boolean
}

export interface UserDoc {
  uid: string
  role: Role
  authMethod: 'studentId' | 'email'
  /** Set iff role === 'student'. */
  studentId: string | null
  displayName: string
  /** Real email. Null for students, who authenticate via a shadow address. */
  email: string | null
  shadowEmail: string | null
  phone?: string | null
  photoURL: string | null
  status: 'active' | 'suspended' | 'archived'
  mustChangePassword: boolean
  claimsVersion: number
  locale: Locale
  notificationPrefs: NotificationPrefs
  fcmTokens?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp | null
}

export type RegistrationStatus =
  | 'pending'
  | 'under_review'
  | 'provisioning'
  | 'provisioning_failed'
  | 'approved'
  | 'rejected'
  | 'waitlisted'

export type TurkishLevel = 'none' | 'beginner' | 'intermediate' | 'fluent' | 'heritage'

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface SecondaryGuardian {
  name: string
  email?: string
  phone?: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface RegistrationDoc {
  id: string
  status: RegistrationStatus

  firstName: string
  lastName: string
  preferredName?: string | null
  dateOfBirth: string // 'YYYY-MM-DD'
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null

  guardianName: string
  /** The real, reachable email — this is where the school contacts the family. */
  guardianEmail: string
  guardianPhone: string
  secondaryGuardian?: SecondaryGuardian | null
  address?: Address | null

  emergencyContact: EmergencyContact
  medicalNotes?: string | null
  allergies?: string | null

  turkishLevel: TurkishLevel
  priorSchooling?: string | null
  requestedGradeLevel: string
  howHeardAboutUs?: string | null
  plan: string

  photoConsent: boolean
  termsAcceptedAt: Timestamp

  schoolYear: number
  submittedAt: Timestamp
  source: 'web'

  // Written only by admins / Cloud Functions.
  assignedStudentId?: string | null
  reviewedBy?: string | null
  reviewedAt?: Timestamp | null
  approvedAt?: Timestamp | null
  rejectionReason?: string | null
  createdUid?: string | null
  provisioningError?: string | null
  adminNotes?: string | null
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  excused: number
  totalSessions: number
  lastUpdated: Timestamp
}

export interface StudentDoc {
  studentId: string
  uid: string
  firstName: string
  lastName: string
  preferredName: string | null
  dateOfBirth: string
  gradeLevel: string
  turkishLevel: TurkishLevel

  guardianName: string
  guardianEmail: string
  guardianPhone: string
  secondaryGuardian: SecondaryGuardian | null
  emergencyContact: EmergencyContact
  medicalNotes: string | null
  photoConsent: boolean

  /**
   * Reserved for a future multi-guardian login model. Unused today, but present
   * from day one so adding separate parent accounts needs no data migration.
   */
  guardianUids: string[]

  enrollmentStatus: 'active' | 'inactive' | 'graduated' | 'withdrawn'
  schoolYear: number
  registrationId: string
  /** Denormalized so a student's dashboard loads in one read. */
  currentClassIds: string[]

  /** Rolling aggregate maintained by the attendance trigger. */
  attendanceSummary?: AttendanceSummary

  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Subject =
  | 'turkish_language'
  | 'culture'
  | 'history'
  | 'music'
  | 'folk_dance'
  | 'religion'
  | 'other'

export interface ClassDoc {
  id: string
  name: string
  subject: Subject
  gradeLevels: string[]
  schoolYear: number
  term: 'fall' | 'spring' | 'full_year'

  /** ISO weekday. Always 6 (Saturday) — this is a weekend school. */
  meetingDay: 6
  startTime: string // 'HH:mm'
  endTime: string
  timezone: string
  room: string | null

  teacherIds: string[]
  primaryTeacherId: string
  assistantIds: string[]

  studentIds: string[]
  enrolledCount: number
  capacity: number

  sessionDates: string[] // every Saturday in the term
  status: 'draft' | 'active' | 'completed' | 'cancelled'

  syllabusUrl: string | null
  description: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

export interface EnrollmentDoc {
  id: string // `${studentId}_${classId}`
  studentId: string
  classId: string
  /** The student's uid, so rules can authorize without an extra get(). */
  uid: string
  schoolYear: number
  status: 'active' | 'dropped' | 'completed'
  enrolledAt: Timestamp
  enrolledBy: string
  droppedAt: Timestamp | null
  finalGrade?: string | null
}

export interface AttendanceRecord {
  status: AttendanceStatus
  arrivedAt?: string | null
  note?: string | null
  markedBy: string
  markedAt: Timestamp
}

/**
 * One document per class per Saturday session. Holding the whole roster in a
 * map makes taking attendance a single atomic write instead of one per student.
 */
export interface AttendanceSessionDoc {
  id: string // `${classId}_${sessionDate}`
  classId: string
  className: string
  sessionDate: string // 'YYYY-MM-DD', always a Saturday
  schoolYear: number
  term: string

  records: Record<string, AttendanceRecord>

  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  totalStudents: number

  status: 'draft' | 'submitted' | 'amended'
  takenBy: string
  takenAt: Timestamp
  submittedAt: Timestamp | null
  amendedBy?: string | null
  amendedAt?: Timestamp | null
  classNotes?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Denormalized per-student rows, fanned out by a trigger so history is queryable. */
export interface AttendanceEntryDoc {
  id: string // `${studentId}_${classId}_${sessionDate}`
  studentId: string
  uid: string
  classId: string
  className: string
  sessionDate: string
  schoolYear: number
  status: AttendanceStatus
  note: string | null
  markedAt: Timestamp
}

export interface ReportScores {
  participation: number
  speaking: number
  reading: number
  writing: number
  listening: number
  behavior: number
  homework: number
}

export const SCORE_KEYS: (keyof ReportScores)[] = [
  'participation',
  'speaking',
  'reading',
  'writing',
  'listening',
  'behavior',
  'homework',
]

export interface Attachment {
  name: string
  storagePath: string
  contentType: string
  size: number
}

export interface PerformanceReportDoc {
  id: string
  studentId: string
  /** The student's uid, so rules authorize without a get(). */
  uid: string
  classId: string
  className: string
  teacherId: string
  teacherName: string

  schoolYear: number
  term: 'fall' | 'spring'
  periodType: 'weekly' | 'monthly' | 'midterm' | 'final'
  periodStart: string
  periodEnd: string

  scores: ReportScores
  overallGrade: string | null

  strengths: string
  areasForImprovement: string
  teacherComments: string
  recommendedActions: string | null
  guardianVisible: boolean

  /** Drafts are invisible to students — enforced in rules, not just the UI. */
  status: 'draft' | 'submitted' | 'published'
  publishedAt: Timestamp | null
  publishedBy: string | null
  acknowledgedByGuardianAt: Timestamp | null

  attachments: Attachment[]

  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ConversationType = 'direct' | 'group' | 'class_announcement' | 'school_announcement'

export interface ConversationDoc {
  id: string
  type: ConversationType
  title: string | null
  participantIds: string[]
  participantRoles: Record<string, Role>
  participantNames: Record<string, string>
  classId: string | null
  createdBy: string
  createdAt: Timestamp

  lastMessage: {
    text: string
    senderId: string
    senderName: string
    sentAt: Timestamp
  } | null
  lastMessageAt: Timestamp
  unreadCounts: Record<string, number>
  readAt: Record<string, Timestamp>
  isArchived: boolean
  /** Announcements are locked: recipients cannot reply. */
  isLocked: boolean
}

export interface MessageDoc {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: Role
  text: string
  attachments: Attachment[]
  sentAt: Timestamp
  editedAt: Timestamp | null
  /** Soft delete only, to preserve the audit trail. */
  deletedAt: Timestamp | null
  readBy: string[]
}

export type NotificationType =
  | 'registration_submitted'
  | 'registration_approved'
  | 'attendance_marked'
  | 'attendance_absent'
  | 'report_published'
  | 'new_message'
  | 'class_assigned'
  | 'announcement'
  | 'system'

export interface NotificationDoc {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  icon: string | null
  link: string | null
  entityType: 'registration' | 'student' | 'class' | 'report' | 'conversation' | null
  entityId: string | null
  priority: 'low' | 'normal' | 'high'
  isRead: boolean
  readAt: Timestamp | null
  createdAt: Timestamp
  /** Backed by a Firestore TTL policy — cleanup needs no cron. */
  expiresAt: Timestamp | null
}

export interface CounterDoc {
  value: number
  schoolYear?: number
  updatedAt: Timestamp
}

export interface StudentIdReservationDoc {
  studentId: string
  registrationId: string
  schoolYear: number
  state: 'claimed' | 'issued' | 'released'
  uid?: string
  claimedAt: Timestamp
}

export interface AuditLogDoc {
  id: string
  actorUid: string
  actorRole: Role
  action: string
  targetType: string
  targetId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  at: Timestamp
}
