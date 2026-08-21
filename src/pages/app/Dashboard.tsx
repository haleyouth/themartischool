import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StaggerGroup, StaggerItem } from '@/components/motion'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import {
  useAttendanceHistory,
  useClasses,
  useConversations,
  useMyClasses,
  usePublishedReports,
  useRegistrations,
  useReports,
  useStudents,
} from '@/lib/hooks'
import { formatDate, formatRelative, fullName, percent } from '@/lib/utils'

export default function Dashboard() {
  const { role } = useAuth()

  if (role === 'student') return <StudentDashboard />
  if (role === 'teacher') return <TeacherDashboard />
  return <AdminDashboard />
}

function DashboardHeader({ name }: { name: string }) {
  const { t } = useI18n()
  return (
    <div className="mb-7">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
        {t('dash.welcome', { name })}
      </h1>
      <p className="mt-1.5 text-sm text-ink-600">{t('dash.welcomeSub')}</p>
    </div>
  )
}

/* ── Director & principal ─────────────────────────────────── */

function AdminDashboard() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()

  const { data: pending } = useRegistrations('pending')
  const { data: students } = useStudents()
  const { data: classes } = useClasses()
  const { data: conversations } = useConversations(auth.user?.uid)

  const activeStudents = students.filter((s) => s.enrollmentStatus === 'active')
  const activeClasses = classes.filter((c) => c.status === 'active')
  const unread = conversations.reduce(
    (sum, conv) => sum + (conv.unreadCounts?.[auth.user?.uid ?? ''] ?? 0),
    0,
  )

  // Average attendance across students who have a recorded summary.
  const withSummary = activeStudents.filter((s) => s.attendanceSummary?.totalSessions)
  const attendanceRate = withSummary.length
    ? Math.round(
        withSummary.reduce((sum, s) => {
          const summary = s.attendanceSummary!
          return sum + percent(summary.present + summary.late, summary.totalSessions)
        }, 0) / withSummary.length,
      )
    : 0

  return (
    <>
      <DashboardHeader name={auth.profile?.displayName?.split(' ')[0] ?? ''} />

      <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label={t('dash.newApplications')}
            value={pending.length}
            icon={<ClipboardList className="h-5 w-5" />}
            accent="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.totalStudents')}
            value={activeStudents.length}
            icon={<GraduationCap className="h-5 w-5" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.activeClasses')}
            value={activeClasses.length}
            icon={<BookOpen className="h-5 w-5" />}
            accent="emerald"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.attendanceRate')}
            value={`${attendanceRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="crimson"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Pending applications */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('reg.title')}
            subtitle={t('dash.pendingReview')}
            action={
              <Link
                to="/app/registrations"
                className="text-xs font-semibold text-marti-600 hover:text-marti-800"
              >
                {t('common.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {pending.length === 0 ? (
              <EmptyState
                className="m-4 border-0 bg-transparent"
                icon={<ClipboardList className="h-6 w-6" />}
                title={t('reg.noRegistrations')}
                description={t('reg.noRegistrationsBody')}
              />
            ) : (
              <ul className="divide-y divide-cream-200">
                {pending.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      to="/app/registrations"
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream-100"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunshine-100 text-sunshine-700">
                        <UserPlus className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {fullName(item.firstName, item.lastName)}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {t('reg.grade')} {item.requestedGradeLevel} · {item.guardianEmail}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {formatRelative(item.submittedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader title={t('dash.quickActions')} />
          <CardBody className="space-y-2">
            {[
              { to: '/app/registrations', icon: ClipboardList, key: 'dash.registrations' },
              { to: '/app/students', icon: GraduationCap, key: 'dash.students' },
              { to: '/app/classes', icon: BookOpen, key: 'dash.classes' },
              { to: '/app/messages', icon: MessageSquare, key: 'dash.messages', badge: unread },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-marti-200 hover:bg-marti-50/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marti-50 text-marti-600 transition-colors group-hover:bg-marti-600 group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink-800">{t(action.key)}</span>
                  {action.badge ? (
                    <Badge tone="danger" size="sm">
                      {action.badge}
                    </Badge>
                  ) : null}
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Classes overview */}
      <Card className="mt-6">
        <CardHeader
          title={t('classes.title')}
          action={
            <Link
              to="/app/classes"
              className="text-xs font-semibold text-marti-600 hover:text-marti-800"
            >
              {t('common.viewAll')}
            </Link>
          }
        />
        <CardBody className="p-0">
          {classes.length === 0 ? (
            <EmptyState
              className="m-4 border-0 bg-transparent"
              icon={<BookOpen className="h-6 w-6" />}
              title={t('classes.noClasses')}
              description={t('classes.noClassesBody')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('classes.className')}</th>
                    <th className="px-5 py-3 font-semibold">{t('classes.time')}</th>
                    <th className="px-5 py-3 font-semibold">{t('classes.enrolled')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {classes.slice(0, 6).map((cls) => (
                    <tr key={cls.id} className="transition-colors hover:bg-cream-100">
                      <td className="px-5 py-3.5 font-medium text-ink-900">{cls.name}</td>
                      <td className="px-5 py-3.5 text-ink-600">
                        {cls.startTime}-{cls.endTime}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">
                        {cls.enrolledCount} / {cls.capacity}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(cls.status)} size="sm">
                          {t(
                            `classes.status${cls.status.charAt(0).toUpperCase()}${cls.status.slice(1)}`,
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
      <p className="sr-only">{intlLocale}</p>
    </>
  )
}

/* ── Teacher ──────────────────────────────────────────────── */

function TeacherDashboard() {
  const { t } = useI18n()
  const auth = useAuth()
  const { data: classes } = useMyClasses()
  const { data: reports } = useReports(auth.user?.uid)
  const { data: conversations } = useConversations(auth.user?.uid)

  const drafts = reports.filter((r) => r.status === 'draft')
  const published = reports.filter((r) => r.status === 'published')
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.enrolledCount ?? 0), 0)
  const unread = conversations.reduce(
    (sum, conv) => sum + (conv.unreadCounts?.[auth.user?.uid ?? ''] ?? 0),
    0,
  )

  return (
    <>
      <DashboardHeader name={auth.profile?.displayName?.split(' ')[0] ?? ''} />

      <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label={t('dash.myClasses')}
            value={classes.length}
            icon={<BookOpen className="h-5 w-5" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.totalStudents')}
            value={totalStudents}
            icon={<GraduationCap className="h-5 w-5" />}
            accent="emerald"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.draftReports')}
            value={drafts.length}
            icon={<FileBarChart className="h-5 w-5" />}
            accent="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.publishedReports')}
            value={published.length}
            icon={<FileBarChart className="h-5 w-5" />}
            accent="crimson"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dash.myClasses')}
            action={
              <Link
                to="/app/attendance"
                className="text-xs font-semibold text-marti-600 hover:text-marti-800"
              >
                {t('attendance.takeAttendance')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {classes.length === 0 ? (
              <EmptyState
                className="m-4 border-0 bg-transparent"
                icon={<BookOpen className="h-6 w-6" />}
                title={t('classes.noClasses')}
              />
            ) : (
              <ul className="divide-y divide-cream-200">
                {classes.map((cls) => (
                  <li key={cls.id}>
                    <Link
                      to="/app/attendance"
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-cream-100"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marti-50 text-marti-600">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {cls.name}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {cls.startTime}-{cls.endTime} · {cls.room ?? '-'}
                        </span>
                      </span>
                      <Badge tone="marti" size="sm">
                        {cls.enrolledCount} {t('programs.students')}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('dash.quickActions')} />
          <CardBody className="space-y-2">
            {[
              { to: '/app/attendance', icon: CalendarCheck, key: 'attendance.takeAttendance' },
              { to: '/app/reports', icon: FileBarChart, key: 'reports.newReport' },
              { to: '/app/students', icon: GraduationCap, key: 'dash.students' },
              { to: '/app/messages', icon: MessageSquare, key: 'dash.messages', badge: unread },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-marti-200 hover:bg-marti-50/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marti-50 text-marti-600 transition-colors group-hover:bg-marti-600 group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink-800">{t(action.key)}</span>
                  {action.badge ? (
                    <Badge tone="danger" size="sm">
                      {action.badge}
                    </Badge>
                  ) : null}
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

/* ── Student ──────────────────────────────────────────────── */

function StudentDashboard() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const studentId = auth.claims?.studentId

  const { data: attendance } = useAttendanceHistory(studentId)
  const { data: reports } = usePublishedReports(auth.user?.uid)

  const present = attendance.filter((a) => a.status === 'present').length
  const late = attendance.filter((a) => a.status === 'late').length
  const absent = attendance.filter((a) => a.status === 'absent').length
  const rate = percent(present + late, attendance.length)

  return (
    <>
      <DashboardHeader name={auth.profile?.displayName?.split(' ')[0] ?? ''} />

      <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            label={t('attendance.rate')}
            value={`${rate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="emerald"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('attendance.present')}
            value={present}
            icon={<CalendarCheck className="h-5 w-5" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('attendance.absent')}
            value={absent}
            icon={<CalendarCheck className="h-5 w-5" />}
            accent="crimson"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label={t('dash.myReports')}
            value={reports.length}
            icon={<FileBarChart className="h-5 w-5" />}
            accent="gold"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('attendance.historyTitle')}
            action={
              <Link
                to="/app/attendance"
                className="text-xs font-semibold text-marti-600 hover:text-marti-800"
              >
                {t('common.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {attendance.length === 0 ? (
              <EmptyState
                className="m-4 border-0 bg-transparent"
                icon={<CalendarCheck className="h-6 w-6" />}
                title={t('students.noAttendance')}
              />
            ) : (
              <ul className="divide-y divide-cream-200">
                {attendance.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {entry.className}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {formatDate(entry.sessionDate, intlLocale)}
                      </span>
                    </span>
                    <Badge tone={statusTone(entry.status)} size="sm">
                      {t(`attendance.${entry.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('dash.myReports')}
            action={
              <Link
                to="/app/reports"
                className="text-xs font-semibold text-marti-600 hover:text-marti-800"
              >
                {t('common.viewAll')}
              </Link>
            }
          />
          <CardBody className="p-0">
            {reports.length === 0 ? (
              <EmptyState
                className="m-4 border-0 bg-transparent"
                icon={<FileBarChart className="h-6 w-6" />}
                title={t('reports.noPublishedReports')}
                description={t('reports.noPublishedReportsBody')}
              />
            ) : (
              <ul className="divide-y divide-cream-200">
                {reports.slice(0, 6).map((report) => (
                  <li key={report.id}>
                    <Link
                      to="/app/reports"
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream-100"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {report.className}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {t(
                            `reports.period${report.periodType.charAt(0).toUpperCase()}${report.periodType.slice(1)}`,
                          )}{' '}
                          · {formatDate(report.periodEnd, intlLocale)}
                        </span>
                      </span>
                      {report.overallGrade && (
                        <Badge tone="success" size="sm">
                          {report.overallGrade}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
