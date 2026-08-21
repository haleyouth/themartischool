import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { randomInt } from 'node:crypto'

export type Role = 'director' | 'principal' | 'teacher' | 'student'

export const SHADOW_EMAIL_DOMAIN = 'students.themartischool.app'
export const STUDENT_ID_PREFIX = 'MRT'
export const STUDENT_ID_PATTERN = /^MRT-\d{4}-\d{4}$/

/**
 * Must stay identical to src/lib/studentId.ts on the client. If these two ever
 * disagree, students silently cannot sign in.
 */
export function formatStudentId(schoolYear: number, sequence: number): string {
  return `${STUDENT_ID_PREFIX}-${schoolYear}-${String(sequence).padStart(4, '0')}`
}

export function toShadowEmail(studentId: string): string {
  const canonical = studentId.trim().toUpperCase()
  if (!STUDENT_ID_PATTERN.test(canonical)) {
    throw new HttpsError('invalid-argument', `Invalid student ID: ${studentId}`)
  }
  return `${canonical.toLowerCase()}@${SHADOW_EMAIL_DOMAIN}`
}

/** The academic year is labelled by the year it begins; July is the cutover. */
export function currentSchoolYear(now: Date = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
}

/**
 * Human-transcribable temporary password: no ambiguous glyphs (0/O, 1/l/I),
 * because an administrator reads this aloud or writes it on paper.
 */
export function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const symbols = '!@#$%&*'
  let out = ''
  for (let i = 0; i < length - 2; i++) {
    out += alphabet[randomInt(alphabet.length)]
  }
  // Guarantee a digit and a symbol so it satisfies any password policy.
  out += String(randomInt(10))
  out += symbols[randomInt(symbols.length)]
  return out
}

export function requireAuth(request: CallableRequest): { uid: string; role: Role } {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const role = auth.token.role as Role | undefined
  if (!role) throw new HttpsError('permission-denied', 'Account is not provisioned.')
  if (auth.token.active === false) {
    throw new HttpsError('permission-denied', 'Account is suspended.')
  }
  return { uid: auth.uid, role }
}

export function requireAdmin(request: CallableRequest) {
  const caller = requireAuth(request)
  if (caller.role !== 'director' && caller.role !== 'principal') {
    throw new HttpsError('permission-denied', 'Administrators only.')
  }
  return caller
}

export function requireDirector(request: CallableRequest) {
  const caller = requireAuth(request)
  if (caller.role !== 'director') {
    throw new HttpsError('permission-denied', 'Directors only.')
  }
  return caller
}

/**
 * Records a privileged action. A school handling minors' records needs a
 * durable trail of who approved, rejected, promoted or published what.
 */
export async function writeAudit(entry: {
  actorUid: string
  actorRole: Role
  action: string
  targetType: string
  targetId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}) {
  await getFirestore()
    .collection('auditLogs')
    .add({
      ...entry,
      before: entry.before ?? null,
      after: entry.after ?? null,
      at: FieldValue.serverTimestamp(),
    })
}

/** Queues an in-app notification. A trigger fans it out to email/push. */
export async function notify(entry: {
  userId: string
  type: string
  title: string
  body: string
  link?: string | null
  entityType?: string | null
  entityId?: string | null
  priority?: 'low' | 'normal' | 'high'
}) {
  const expires = new Date()
  expires.setDate(expires.getDate() + 90)

  await getFirestore()
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
      createdAt: FieldValue.serverTimestamp(),
      // Backed by a Firestore TTL policy on expiresAt, so no cleanup cron.
      expiresAt: expires,
    })
}

/** Every admin, used when a new application needs attention. */
export async function adminUids(): Promise<string[]> {
  const snap = await getFirestore()
    .collection('users')
    .where('role', 'in', ['director', 'principal'])
    .get()
  return snap.docs.map((doc) => doc.id)
}
