import { motion } from 'framer-motion'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  BookOpen,
  CalendarPlus,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { CardSkeleton, EmptyState } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { isAdminRole, useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { GRADE_LEVELS } from '@/lib/content'
import { db, functions } from '@/lib/firebase'
import { useClasses, useEnrollments, useMyClasses, useStaff, useStudents } from '@/lib/hooks'
import { currentSchoolYear, formatSchoolYear } from '@/lib/schoolYear'
import { cn, formatTime, fullName, percent } from '@/lib/utils'
import type { ClassDoc } from '@/types/models'

const SUBJECTS = [
  'turkish_language',
  'culture',
  'history',
  'music',
  'folk_dance',
  'religion',
  'other',
] as const

/** 'turkish_language' -> 'Turkish', matching the i18n key names. */
const SUBJECT_KEY: Record<string, string> = {
  turkish_language: 'Turkish',
  culture: 'Culture',
  history: 'History',
  music: 'Music',
  folk_dance: 'FolkDance',
  religion: 'Religion',
  other: 'Other',
}

interface ClassForm {
  name: string
  subject: string
  gradeLevels: string[]
  startTime: string
  endTime: string
  room: string
  capacity: number
  description: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}

const EMPTY_FORM: ClassForm = {
  name: '',
  subject: 'turkish_language',
  gradeLevels: [],
  startTime: '10:00',
  endTime: '11:30',
  room: '',
  capacity: 16,
  description: '',
  status: 'active',
}

export default function Classes() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const admin = isAdminRole(auth.role)

  // Admins see the whole timetable; a teacher sees only their own classes.
  const all = useClasses()
  const mine = useMyClasses()
  const { data: classes, loading } = admin ? all : mine

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ClassDoc | null>(null)
  const [deleting, setDeleting] = useState<ClassDoc | null>(null)
  const [managing, setManaging] = useState<ClassDoc | null>(null)
  const [form, setForm] = useState<ClassForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreating(true)
  }

  function openEdit(cls: ClassDoc) {
    setForm({
      name: cls.name,
      subject: cls.subject,
      gradeLevels: cls.gradeLevels ?? [],
      startTime: cls.startTime,
      endTime: cls.endTime,
      room: cls.room ?? '',
      capacity: cls.capacity,
      description: cls.description ?? '',
      status: cls.status,
    })
    setEditing(cls)
  }

  async function saveClass() {
    if (!form.name.trim() || !auth.user) return
    setBusy(true)
    try {
      if (editing) {
        await updateDoc(doc(db, 'classes', editing.id), {
          name: form.name.trim(),
          subject: form.subject,
          gradeLevels: form.gradeLevels,
          startTime: form.startTime,
          endTime: form.endTime,
          room: form.room.trim() || null,
          capacity: Number(form.capacity),
          description: form.description.trim() || null,
          status: form.status,
          // The rules require this to stay 6. A weekend school runs Saturdays.
          meetingDay: 6,
          updatedAt: serverTimestamp(),
        })
        toast.success(t('common.saved'))
        setEditing(null)
      } else {
        const id = `class-${Date.now()}`
        await setDoc(doc(db, 'classes', id), {
          id,
          name: form.name.trim(),
          subject: form.subject,
          gradeLevels: form.gradeLevels,
          schoolYear: currentSchoolYear(),
          term: 'full_year',
          meetingDay: 6,
          startTime: form.startTime,
          endTime: form.endTime,
          timezone: 'America/New_York',
          room: form.room.trim() || null,
          teacherIds: [],
          primaryTeacherId: '',
          assistantIds: [],
          studentIds: [],
          enrolledCount: 0,
          capacity: Number(form.capacity),
          sessionDates: [],
          status: form.status,
          syllabusUrl: null,
          description: form.description.trim() || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: auth.user.uid,
        })
        toast.success(t('common.saved'))
        setCreating(false)
      }
    } catch (error) {
      console.error('Save class failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      // Cancelling keeps the record and its attendance history. Hard deletion
      // is possible only once a class is empty, and would lose that history.
      await updateDoc(doc(db, 'classes', deleting.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      })
      toast.success(t('classes.cancelled'))
      setDeleting(null)
    } catch (error) {
      console.error('Cancel class failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function generateSessions(cls: ClassDoc) {
    setBusy(true)
    try {
      const year = currentSchoolYear()
      const result = await httpsCallable<
        { classId: string; termStart: string; termEnd: string; skipDates: string[] },
        { sessionDates: string[] }
      >(
        functions,
        'generateSessionDates',
      )({
        classId: cls.id,
        termStart: `${year}-09-01`,
        termEnd: `${year + 1}-06-10`,
        skipDates: [],
      })
      toast.success(
        t('classes.sessionsCreated', { count: String(result.data.sessionDates.length) }),
      )
    } catch (error) {
      console.error('Generate sessions failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('classes.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            {t('classes.subtitle', { year: formatSchoolYear(currentSchoolYear()) })}
          </p>
        </div>
        {admin && (
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            {t('classes.createClass')}
          </Button>
        )}
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t('classes.noClasses')}
          description={t('classes.noClassesBody')}
          action={admin ? { label: t('classes.createClass'), onClick: openCreate } : undefined}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls, index) => {
            const fill = percent(cls.enrolledCount, cls.capacity)
            const full = cls.enrolledCount >= cls.capacity

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.4) }}
              >
                <Card hover className="flex h-full flex-col">
                  <CardBody className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-marti-50 text-marti-600">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <Badge tone={statusTone(cls.status)} size="sm">
                        {t(`classes.status${cap(cls.status)}`)}
                      </Badge>
                    </div>

                    <h2 className="mt-4 font-display text-lg font-extrabold text-ink">
                      {cls.name}
                    </h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-marti-600">
                      {t(`classes.subject${SUBJECT_KEY[cls.subject] ?? 'Other'}`)}
                    </p>

                    {cls.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-600">
                        {cls.description}
                      </p>
                    )}

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-ink-600">
                        <Clock className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                        {formatTime(cls.startTime, intlLocale)} to{' '}
                        {formatTime(cls.endTime, intlLocale)}
                      </div>
                      {cls.room && (
                        <div className="flex items-center gap-2 text-ink-600">
                          <MapPin className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                          {cls.room}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-ink-600">
                        <Users className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                        {cls.enrolledCount} / {cls.capacity} {t('programs.students')}
                      </div>
                    </dl>

                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fill}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            'h-full rounded-full',
                            full ? 'bg-magenta-500' : fill > 80 ? 'bg-amber-500' : 'bg-marti-600',
                          )}
                        />
                      </div>
                      {full && (
                        <p className="mt-1.5 text-xs font-bold text-magenta-600">
                          {t('classes.full')}
                        </p>
                      )}
                    </div>

                    {admin && (
                      <div className="mt-auto flex flex-wrap gap-2 border-t-2 border-dashed border-ink-100 pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManaging(cls)}
                          leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                        >
                          {t('classes.manage')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(cls)}
                          title={t('classes.editClass')}
                          aria-label={t('classes.editClass')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => generateSessions(cls)}
                          title={t('classes.generateSessions')}
                          aria-label={t('classes.generateSessions')}
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(cls)}
                          title={t('classes.deleteTitle')}
                          aria-label={t('classes.deleteTitle')}
                        >
                          <Trash2 className="h-4 w-4 text-magenta-600" />
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create or edit */}
      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? t('classes.editClass') : t('classes.createClass')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
              disabled={busy}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={saveClass} loading={busy} disabled={!form.name.trim()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label={t('classes.className')}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('classes.subject')}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              options={SUBJECTS.map((s) => ({
                value: s,
                label: t(`classes.subject${SUBJECT_KEY[s]}`),
              }))}
            />
            <Select
              label={t('common.status')}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClassForm['status'] })}
              options={[
                { value: 'active', label: t('classes.statusActive') },
                { value: 'draft', label: t('classes.statusDraft') },
                { value: 'completed', label: t('classes.statusCompleted') },
                { value: 'cancelled', label: t('classes.statusCancelled') },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="class-start"
                className="mb-1.5 block text-sm font-bold text-ink-700"
              >
                {t('classes.time')}
              </label>
              <input
                id="class-start"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="h-11 w-full rounded-2xl border-2 border-ink-200 bg-white px-3 text-sm font-semibold text-ink transition-colors focus:border-marti-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="class-end" className="mb-1.5 block text-sm font-bold text-ink-700">
                {t('common.of')}
              </label>
              <input
                id="class-end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="h-11 w-full rounded-2xl border-2 border-ink-200 bg-white px-3 text-sm font-semibold text-ink transition-colors focus:border-marti-500 focus:outline-none"
              />
            </div>
            <Input
              label={t('classes.capacity')}
              type="number"
              min={1}
              max={300}
              value={String(form.capacity)}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </div>

          <Input
            label={t('classes.room')}
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })}
          />

          <div>
            <span className="mb-1.5 block text-sm font-bold text-ink-700">
              {t('classes.gradeLevels')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GRADE_LEVELS.map((grade) => {
                const on = form.gradeLevels.includes(grade)
                return (
                  <button
                    key={grade}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setForm({
                        ...form,
                        gradeLevels: on
                          ? form.gradeLevels.filter((g) => g !== grade)
                          : [...form.gradeLevels, grade],
                      })
                    }
                    className={cn(
                      'h-9 min-w-9 rounded-xl border-2 px-2.5 text-xs font-bold transition-colors',
                      on
                        ? 'border-ink bg-marti-600 text-white'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-marti-300',
                    )}
                  >
                    {grade}
                  </button>
                )
              })}
            </div>
          </div>

          <Textarea
            label={t('classes.description')}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <p className="rounded-2xl bg-cream-200 px-4 py-3 text-xs leading-relaxed text-ink-600">
            {t('classes.saturdayNote')}
          </p>
        </div>
      </Modal>

      <ManageClassModal cls={managing} onClose={() => setManaging(null)} />

      {/* Cancel confirmation */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('classes.deleteTitle')}
        description={t('classes.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              {t('classes.confirmDelete')}
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="rounded-2xl bg-cream-200 p-4">
            <p className="text-sm font-bold text-ink">{deleting.name}</p>
            <p className="mt-1 text-xs text-ink-500">
              {deleting.enrolledCount} {t('programs.students')}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/** Assigns teachers and enrolls students for a single class. */
function ManageClassModal({ cls, onClose }: { cls: ClassDoc | null; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const { data: users } = useStaff()
  const { data: students } = useStudents(Boolean(cls))
  const { data: enrollments } = useEnrollments(cls?.id)

  const teachers = useMemo(
    () => users.filter((u) => u.role === 'teacher' && u.status === 'active'),
    [users],
  )
  const enrolledIds = useMemo(
    () => new Set(enrollments.filter((e) => e.status === 'active').map((e) => e.studentId)),
    [enrollments],
  )

  async function assignTeacher(teacherId: string, assigned: boolean) {
    if (!cls) return
    setBusy(true)
    try {
      await httpsCallable(
        functions,
        'assignTeacherToClass',
      )({
        classId: cls.id,
        teacherId,
        isPrimary: !assigned && !cls.primaryTeacherId,
        remove: assigned,
      })
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Assign teacher failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleStudent(studentId: string, enrolled: boolean) {
    if (!cls) return
    setBusy(true)
    try {
      await httpsCallable(
        functions,
        enrolled ? 'unenrollStudent' : 'enrollStudent',
      )({ studentId, classId: cls.id })
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Enrollment change failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!cls}
      onClose={onClose}
      title={cls?.name ?? ''}
      description={t('classes.manageBody')}
      size="lg"
      footer={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      {cls && (
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
              {t('classes.teachers')}
            </h4>
            <ul className="mt-3 space-y-2">
              {teachers.length === 0 && (
                <li className="text-sm text-ink-500">{t('staff.noStaff')}</li>
              )}
              {teachers.map((teacher) => {
                const assigned = (cls.teacherIds ?? []).includes(teacher.uid)
                return (
                  <li
                    key={teacher.uid}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink-100 px-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">
                        {teacher.displayName}
                      </span>
                      <span className="block truncate text-xs text-ink-500">{teacher.email}</span>
                    </span>
                    <Button
                      size="sm"
                      variant={assigned ? 'ghost' : 'outline'}
                      disabled={busy}
                      onClick={() => assignTeacher(teacher.uid, assigned)}
                    >
                      {assigned ? t('classes.unassign') : t('classes.assign')}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
              {t('classes.roster')} ({enrolledIds.size} / {cls.capacity})
            </h4>
            <ul className="scrollbar-thin mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {students.length === 0 && (
                <li className="text-sm text-ink-500">{t('students.noStudents')}</li>
              )}
              {students.map((student) => {
                const enrolled = enrolledIds.has(student.studentId)
                const atCapacity = !enrolled && enrolledIds.size >= cls.capacity
                return (
                  <li
                    key={student.studentId}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink-100 px-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">
                        {fullName(student.firstName, student.lastName)}
                      </span>
                      <span className="block truncate font-mono text-xs text-ink-500">
                        {student.studentId}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant={enrolled ? 'ghost' : 'outline'}
                      disabled={busy || atCapacity}
                      title={atCapacity ? t('classes.full') : undefined}
                      onClick={() => toggleStudent(student.studentId, enrolled)}
                    >
                      {enrolled ? t('students.unenroll') : t('classes.assign')}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
