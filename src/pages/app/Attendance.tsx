import { motion } from 'framer-motion'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  CalendarCheck,
  CheckCheck,
  ClipboardCheck,
  Save,
  Send,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { db } from '@/lib/firebase'
import { useAttendanceHistory, useEnrollments, useMyClasses, useStudents } from '@/lib/hooks'
import {
  currentSchoolYear,
  fromDateKey,
  isSaturday,
  mostRecentSaturday,
  termForDate,
} from '@/lib/schoolYear'
import { cn, formatDate, fullName, percent } from '@/lib/utils'
import type { AttendanceStatus } from '@/types/models'

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-mint-600 text-white',
  absent: 'bg-coral-600 text-white',
  late: 'bg-sunshine-500 text-white',
  excused: 'bg-marti-600 text-white',
}

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export default function Attendance() {
  const { role } = useAuth()
  return role === 'student' ? <StudentAttendance /> : <TeacherAttendance />
}

/* ── Teacher & admin: take attendance ─────────────────────── */

function TeacherAttendance() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()

  const { data: classes, loading: classesLoading } = useMyClasses()
  const [classId, setClassId] = useState('')
  const [sessionDate, setSessionDate] = useState(mostRecentSaturday())
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({})
  const [classNotes, setClassNotes] = useState('')
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: enrollments } = useEnrollments(classId || undefined)
  const { data: students } = useStudents(Boolean(classId))

  const selectedClass = classes.find((cls) => cls.id === classId)

  // Default to the teacher's first class once classes load.
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classes, classId])

  const roster = useMemo(() => {
    const enrolled = new Set(
      enrollments.filter((e) => e.status === 'active').map((e) => e.studentId),
    )
    return students
      .filter((s) => enrolled.has(s.studentId))
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  }, [enrollments, students])

  const sessionId = classId && sessionDate ? `${classId}_${sessionDate}` : null

  // Load any attendance already recorded for this class and date.
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setLoadingSession(true)

    getDoc(doc(db, 'attendance', sessionId))
      .then((snap) => {
        if (cancelled) return
        if (snap.exists()) {
          const data = snap.data()
          const loaded: Record<string, AttendanceStatus> = {}
          for (const [studentId, record] of Object.entries(
            (data.records ?? {}) as Record<string, { status: AttendanceStatus }>,
          )) {
            loaded[studentId] = record.status
          }
          setRecords(loaded)
          setClassNotes(data.classNotes ?? '')
          setExistingStatus(data.status ?? null)
        } else {
          setRecords({})
          setClassNotes('')
          setExistingStatus(null)
        }
      })
      .catch((error) => console.error('Load attendance failed', error))
      .finally(() => {
        if (!cancelled) setLoadingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const marked = Object.keys(records).length
  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }
    for (const status of Object.values(records)) tally[status] += 1
    return tally
  }, [records])

  const dateIsSaturday = sessionDate ? isSaturday(fromDateKey(sessionDate)) : false

  function markAllPresent() {
    const next: Record<string, AttendanceStatus> = {}
    for (const student of roster) next[student.studentId] = 'present'
    setRecords(next)
  }

  async function save(submit: boolean) {
    if (!sessionId || !selectedClass || !auth.user) return
    setSaving(true)

    try {
      const now = serverTimestamp()
      // The whole roster is one document, so a class is saved atomically:
      // there is no state where half the students are marked.
      const recordMap = Object.fromEntries(
        Object.entries(records).map(([studentId, status]) => [
          studentId,
          { status, markedBy: auth.user!.uid, markedAt: new Date(), note: null },
        ]),
      )

      await setDoc(
        doc(db, 'attendance', sessionId),
        {
          id: sessionId,
          classId,
          className: selectedClass.name,
          sessionDate,
          schoolYear: currentSchoolYear(),
          term: termForDate(sessionDate),
          records: recordMap,
          presentCount: counts.present,
          absentCount: counts.absent,
          lateCount: counts.late,
          excusedCount: counts.excused,
          totalStudents: roster.length,
          status: submit ? 'submitted' : 'draft',
          takenBy: auth.user.uid,
          takenAt: now,
          submittedAt: submit ? now : null,
          classNotes: classNotes || null,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      )

      setExistingStatus(submit ? 'submitted' : 'draft')
      toast.success(submit ? t('attendance.submittedSuccess') : t('attendance.savedSuccess'))
    } catch (error) {
      console.error('Save attendance failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setSaving(false)
    }
  }

  if (classesLoading) return <TableSkeleton rows={6} cols={3} />

  if (!classes.length) {
    return (
      <EmptyState
        icon={<CalendarCheck className="h-6 w-6" />}
        title={t('classes.noClasses')}
        description={t('classes.noClassesBody')}
      />
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-950">{t('attendance.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('attendance.subtitle')}</p>
      </div>

      <Card className="mb-6">
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <Select
            label={t('attendance.selectClass')}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
          />
          <div>
            <label
              htmlFor="session-date"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              {t('attendance.sessionDate')}
            </label>
            <input
              id="session-date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 transition-all focus:border-marti-500 focus:outline-none focus:ring-4 focus:ring-marti-500/10"
            />
          </div>
          <Button
            variant="outline"
            onClick={markAllPresent}
            leftIcon={<CheckCheck className="h-4 w-4" />}
            disabled={!roster.length}
          >
            {t('attendance.markAllPresent')}
          </Button>
        </CardBody>
      </Card>

      {!dateIsSaturday && (
        <div className="mb-5 flex gap-2.5 rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('attendance.notSaturday')}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('attendance.present')}
          value={counts.present}
          accent="emerald"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard label={t('attendance.absent')} value={counts.absent} accent="crimson" />
        <StatCard label={t('attendance.late')} value={counts.late} accent="gold" />
        <StatCard
          label={t('attendance.rate')}
          value={`${percent(counts.present + counts.late, roster.length)}%`}
        />
      </div>

      <Card>
        <CardHeader
          title={selectedClass?.name ?? '-'}
          subtitle={`${formatDate(sessionDate, intlLocale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })} · ${marked}/${roster.length}`}
          action={
            existingStatus && (
              <Badge tone={statusTone(existingStatus)} size="sm">
                {t(`attendance.${existingStatus}`)}
              </Badge>
            )
          }
        />
        <CardBody className="p-0">
          {loadingSession ? (
            <div className="p-5">
              <TableSkeleton rows={5} cols={2} />
            </div>
          ) : roster.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<CalendarCheck className="h-6 w-6" />}
              title={t('students.noStudents')}
            />
          ) : (
            <ul className="divide-y divide-cream-200">
              {roster.map((student, index) => (
                <motion.li
                  key={student.studentId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.25) }}
                  className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-cream-100 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marti-50 text-xs font-bold text-marti-700">
                      {student.firstName.charAt(0)}
                      {student.lastName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {fullName(student.firstName, student.lastName, student.preferredName)}
                      </p>
                      <p className="font-mono text-xs text-ink-500">{student.studentId}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((status) => {
                      const active = records[student.studentId] === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setRecords((prev) => ({ ...prev, [student.studentId]: status }))
                          }
                          aria-pressed={active}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
                            active
                              ? STATUS_STYLES[status]
                              : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                          )}
                        >
                          {t(`attendance.${status}`)}
                        </button>
                      )
                    })}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </CardBody>

        {roster.length > 0 && (
          <div className="border-t border-cream-200 p-5">
            <Textarea
              label={t('attendance.classNotes')}
              hint={t('attendance.classNotesHint')}
              rows={2}
              value={classNotes}
              onChange={(e) => setClassNotes(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => save(false)}
                loading={saving}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {t('attendance.saveDraft')}
              </Button>
              <Button
                onClick={() => save(true)}
                loading={saving}
                disabled={marked === 0}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {t('attendance.submitAttendance')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

/* ── Student: my attendance ───────────────────────────────── */

function StudentAttendance() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const { data: history, loading } = useAttendanceHistory(auth.claims?.studentId)

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }
    for (const entry of history) tally[entry.status] += 1
    return tally
  }, [history])

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-950">
          {t('attendance.historyTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('dash.myAttendance')}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('attendance.rate')}
          value={`${percent(counts.present + counts.late, history.length)}%`}
          accent="emerald"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard label={t('attendance.present')} value={counts.present} />
        <StatCard label={t('attendance.absent')} value={counts.absent} accent="crimson" />
        <StatCard label={t('attendance.totalSessions')} value={history.length} accent="gold" />
      </div>

      <Card>
        <CardHeader title={t('attendance.historyTitle')} />
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={5} cols={3} />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<CalendarCheck className="h-6 w-6" />}
              title={t('students.noAttendance')}
            />
          ) : (
            <ul className="divide-y divide-cream-200">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {entry.className}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDate(entry.sessionDate, intlLocale, {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge tone={statusTone(entry.status)} size="sm">
                    {t(`attendance.${entry.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  )
}
