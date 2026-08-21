import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { ArrowLeft, CalendarCheck, Copy, FileBarChart, KeyRound, Mail, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card'
import { EmptyState, PageLoader } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { isAdminRole, useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { db, functions } from '@/lib/firebase'
import { useAttendanceHistory, useReports } from '@/lib/hooks'
import { formatDate, fullName, percent } from '@/lib/utils'
import type { StudentDoc } from '@/types/models'

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()

  const [student, setStudent] = useState<StudentDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'attendance' | 'reports'>('overview')
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: attendance } = useAttendanceHistory(studentId)
  const { data: reports } = useReports(undefined, studentId)

  useEffect(() => {
    if (!studentId) return
    getDoc(doc(db, 'students', studentId))
      .then((snap) => setStudent(snap.exists() ? (snap.data() as StudentDoc) : null))
      .catch((error) => console.error('Load student failed', error))
      .finally(() => setLoading(false))
  }, [studentId])

  async function resetPassword() {
    if (!studentId) return
    setBusy(true)
    try {
      const call = httpsCallable<{ studentId: string }, { tempPassword: string }>(
        functions,
        'adminResetStudentPassword',
      )
      const result = await call({ studentId })
      setNewPassword(result.data.tempPassword)
    } catch (error) {
      console.error('Reset password failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (!student) {
    return <EmptyState title={t('common.noResults')} description={t('students.noStudents')} />
  }

  const summary = student.attendanceSummary
  const rate = summary?.totalSessions
    ? percent(summary.present + summary.late, summary.totalSessions)
    : 0
  const name = fullName(student.firstName, student.lastName, student.preferredName)

  return (
    <>
      <Link
        to="/app/students"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-marti-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('students.title')}
      </Link>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-ink">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-xs font-semibold text-ink-700">
                {student.studentId}
              </code>
              <Badge tone={statusTone(student.enrollmentStatus)} size="sm">
                {t(`students.status${cap(student.enrollmentStatus)}`)}
              </Badge>
              <span className="text-xs text-ink-500">
                {t('students.gradeLevel')} {student.gradeLevel}
              </span>
            </div>
          </div>
          {isAdminRole(auth.role) && (
            <Button
              variant="outline"
              onClick={() => {
                setNewPassword(null)
                setResetting(true)
              }}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              {t('students.resetPassword')}
            </Button>
          )}
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('attendance.rate')}
          value={`${rate}%`}
          accent="emerald"
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard label={t('attendance.present')} value={summary?.present ?? 0} />
        <StatCard label={t('attendance.absent')} value={summary?.absent ?? 0} accent="crimson" />
        <StatCard
          label={t('students.performanceReports')}
          value={reports.length}
          accent="gold"
          icon={<FileBarChart className="h-5 w-5" />}
        />
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: t('students.overview') },
          { value: 'attendance', label: t('students.attendanceHistory'), count: attendance.length },
          { value: 'reports', label: t('students.performanceReports'), count: reports.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('students.contactInfo')} />
            <CardBody className="space-y-3.5">
              <InfoRow label={t('students.guardian')} value={student.guardianName} />
              <InfoRow
                label={t('common.email')}
                value={student.guardianEmail}
                href={`mailto:${student.guardianEmail}`}
                icon={<Mail className="h-3.5 w-3.5" />}
              />
              <InfoRow
                label={t('common.phone')}
                value={student.guardianPhone}
                href={`tel:${student.guardianPhone}`}
                icon={<Phone className="h-3.5 w-3.5" />}
              />
              <InfoRow
                label={t('register.emergencyTitle')}
                value={`${student.emergencyContact.name} · ${student.emergencyContact.phone}`}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('reg.healthInfo')} />
            <CardBody className="space-y-3.5">
              <InfoRow
                label={t('register.dateOfBirth')}
                value={formatDate(student.dateOfBirth, intlLocale)}
              />
              <InfoRow label={t('reg.turkishLevel')} value={student.turkishLevel} />
              <InfoRow label={t('register.medicalNotes')} value={student.medicalNotes || '-'} />
              <InfoRow
                label={t('register.photoConsent')}
                value={student.photoConsent ? t('common.yes') : t('common.no')}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'attendance' && (
        <Card>
          <CardBody className="p-0">
            {attendance.length === 0 ? (
              <EmptyState
                className="m-5 border-0 bg-transparent"
                icon={<CalendarCheck className="h-6 w-6" />}
                title={t('students.noAttendance')}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {attendance.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {entry.className}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDate(entry.sessionDate, intlLocale)}
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
      )}

      {tab === 'reports' && (
        <Card>
          <CardBody className="p-0">
            {reports.length === 0 ? (
              <EmptyState
                className="m-5 border-0 bg-transparent"
                icon={<FileBarChart className="h-6 w-6" />}
                title={t('students.noReports')}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {reports.map((report) => (
                  <li key={report.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {report.className}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDate(report.periodEnd, intlLocale)} · {report.teacherName}
                      </p>
                    </div>
                    {report.overallGrade && (
                      <Badge tone="success" size="sm">
                        {report.overallGrade}
                      </Badge>
                    )}
                    <Badge tone={statusTone(report.status)} size="sm">
                      {t(`reports.status${cap(report.status)}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <Modal
        open={resetting}
        onClose={() => setResetting(false)}
        title={t('students.resetPassword')}
        description={t('students.resetPasswordBody')}
        footer={
          newPassword ? (
            <Button onClick={() => setResetting(false)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetting(false)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={resetPassword} loading={busy}>
                {t('students.resetPassword')}
              </Button>
            </>
          )
        }
      >
        {newPassword ? (
          <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marti-50 text-marti-600">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                {t('students.newPasswordIssued')}
              </p>
              <code className="mt-0.5 block truncate font-mono text-base font-bold text-ink">
                {newPassword}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(newPassword)
                toast.success(t('common.copied'))
              }}
              className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-600">{t('reg.passwordWarning')}</p>
        )}
      </Modal>
    </>
  )
}

function InfoRow({
  label,
  value,
  href,
  icon,
}: {
  label: string
  value: string
  href?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-ink-500">{label}</span>
      {href ? (
        <a
          href={href}
          className="inline-flex items-center gap-1.5 text-right font-medium text-marti-600 hover:text-marti-800"
        >
          {icon}
          {value}
        </a>
      ) : (
        <span className="text-right font-medium text-ink-800">{value}</span>
      )}
    </div>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
