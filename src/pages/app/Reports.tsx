import { motion } from 'framer-motion'
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Eye, FileBarChart, FileDown, Lock, Plus, Send, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminRole } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { db, functions } from '@/lib/firebase'
import {
  useEnrollments,
  useMyClasses,
  usePublishedReports,
  useReports,
  useStudents,
} from '@/lib/hooks'
import { currentSchoolYear, mostRecentSaturday, termForDate } from '@/lib/schoolYear'
import { cn, formatDate, fullName } from '@/lib/utils'
import { SCORE_KEYS, type PerformanceReportDoc, type ReportScores } from '@/types/models'

export default function Reports() {
  const { role } = useAuth()
  return role === 'student' ? <StudentReports /> : <StaffReports />
}

const EMPTY_SCORES: ReportScores = {
  participation: 3,
  speaking: 3,
  reading: 3,
  writing: 3,
  listening: 3,
  behavior: 3,
  homework: 3,
}

/* ── Teacher & admin ──────────────────────────────────────── */

function StaffReports() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const admin = isAdminRole(auth.role)

  // Admins see every report; teachers see only the ones they wrote.
  const { data: reports, loading } = useReports(admin ? undefined : auth.user?.uid)
  const { data: classes } = useMyClasses()
  const { data: students } = useStudents()

  const [composing, setComposing] = useState(false)
  const [viewing, setViewing] = useState<PerformanceReportDoc | null>(null)
  const [publishing, setPublishing] = useState<PerformanceReportDoc | null>(null)
  const [busy, setBusy] = useState(false)

  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'midterm' | 'final'>(
    'monthly',
  )
  const [scores, setScores] = useState<ReportScores>(EMPTY_SCORES)
  const [strengths, setStrengths] = useState('')
  const [areas, setAreas] = useState('')
  const [comments, setComments] = useState('')

  const { data: enrollments } = useEnrollments(classId || undefined)

  const roster = useMemo(() => {
    const enrolled = new Set(
      enrollments.filter((e) => e.status === 'active').map((e) => e.studentId),
    )
    return students.filter((s) => enrolled.has(s.studentId))
  }, [enrollments, students])

  function resetForm() {
    setClassId(classes[0]?.id ?? '')
    setStudentId('')
    setScores(EMPTY_SCORES)
    setStrengths('')
    setAreas('')
    setComments('')
  }

  async function saveReport(submit: boolean) {
    const student = students.find((s) => s.studentId === studentId)
    const cls = classes.find((c) => c.id === classId)
    if (!student || !cls || !auth.user) return

    setBusy(true)
    try {
      const today = mostRecentSaturday()
      await addDoc(collection(db, 'performanceReports'), {
        studentId: student.studentId,
        uid: student.uid,
        classId: cls.id,
        className: cls.name,
        teacherId: auth.user.uid,
        teacherName: auth.profile?.displayName ?? '',
        schoolYear: currentSchoolYear(),
        term: termForDate(today),
        periodType,
        periodStart: today,
        periodEnd: today,
        scores,
        overallGrade: gradeFromScores(scores),
        strengths,
        areasForImprovement: areas,
        teacherComments: comments,
        recommendedActions: null,
        guardianVisible: true,
        // A report is never publishable on create, publishing is an admin act.
        status: submit ? 'submitted' : 'draft',
        publishedAt: null,
        publishedBy: null,
        acknowledgedByGuardianAt: null,
        attachments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success(t('reports.savedSuccess'))
      setComposing(false)
      resetForm()
    } catch (error) {
      console.error('Save report failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function publish(report: PerformanceReportDoc) {
    setBusy(true)
    try {
      const call = httpsCallable<{ reportId: string }, { ok: true }>(
        functions,
        'publishPerformanceReport',
      )
      await call({ reportId: report.id })
      toast.success(t('reports.publishedSuccess'))
      setPublishing(null)
    } catch (error) {
      console.error('Publish failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t('reports.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('reports.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setComposing(true)
          }}
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={!classes.length}
        >
          {t('reports.newReport')}
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={5} cols={4} />
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<FileBarChart className="h-6 w-6" />}
              title={t('reports.noReports')}
              description={t('reports.noReportsBody')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('reports.student')}</th>
                    <th className="px-5 py-3 font-semibold">{t('classes.className')}</th>
                    <th className="px-5 py-3 font-semibold">{t('reports.period')}</th>
                    <th className="px-5 py-3 font-semibold">{t('reports.overallGrade')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.status')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {reports.map((report, index) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="transition-colors hover:bg-cream-200"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink">{report.studentId}</p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{report.className}</td>
                      <td className="px-5 py-3.5 text-ink-600">
                        {t(`reports.period${cap(report.periodType)}`)} ·{' '}
                        {formatDate(report.periodEnd, intlLocale)}
                      </td>
                      <td className="px-5 py-3.5">
                        {report.overallGrade && (
                          <Badge tone="success" size="sm">
                            {report.overallGrade}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(report.status)} size="sm">
                          {t(`reports.status${cap(report.status)}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {admin && report.status === 'submitted' && (
                            <Button size="sm" onClick={() => setPublishing(report)}>
                              {t('reports.publish')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Compose */}
      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title={t('reports.newReport')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposing(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="outline" onClick={() => saveReport(false)} loading={busy} disabled={!studentId}>
              {t('attendance.saveDraft')}
            </Button>
            <Button
              onClick={() => saveReport(true)}
              loading={busy}
              disabled={!studentId}
              leftIcon={<Send className="h-4 w-4" />}
            >
              {t('common.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('classes.className')}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setStudentId('')
              }}
            >
              <option value="">{t('common.none')}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </Select>
            <Select
              label={t('reports.student')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!classId}
            >
              <option value="">{t('common.none')}</option>
              {roster.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {fullName(student.firstName, student.lastName)}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label={t('reports.period')}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as typeof periodType)}
            options={[
              { value: 'weekly', label: t('reports.periodWeekly') },
              { value: 'monthly', label: t('reports.periodMonthly') },
              { value: 'midterm', label: t('reports.periodMidterm') },
              { value: 'final', label: t('reports.periodFinal') },
            ]}
          />

          <div>
            <p className="text-sm font-medium text-ink-700">{t('reports.scores')}</p>
            <p className="mt-1 text-xs text-ink-500">{t('reports.scoreHint')}</p>
            <div className="mt-4 space-y-3">
              {SCORE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-ink-700">{t(`reports.score${cap(key)}`)}</span>
                  <StarRating
                    value={scores[key]}
                    onChange={(value) => setScores((prev) => ({ ...prev, [key]: value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <Textarea
            label={t('reports.strengths')}
            hint={t('reports.strengthsHint')}
            rows={3}
            maxLength={3000}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
          />
          <Textarea
            label={t('reports.areasForImprovement')}
            hint={t('reports.areasHint')}
            rows={3}
            maxLength={3000}
            value={areas}
            onChange={(e) => setAreas(e.target.value)}
          />
          <Textarea
            label={t('reports.teacherComments')}
            hint={t('reports.commentsHint')}
            rows={4}
            maxLength={5000}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      </Modal>

      {/* View */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={t('reports.title')}
        size="lg"
      >
        {viewing && <ReportView report={viewing} />}
      </Modal>

      {/* Publish confirmation */}
      <Modal
        open={!!publishing}
        onClose={() => setPublishing(null)}
        title={t('reports.publish')}
        description={t('reports.publishBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishing(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => publishing && publish(publishing)} loading={busy}>
              {t('reports.confirmPublish')}
            </Button>
          </>
        }
      >
        {publishing && (
          <div className="rounded-xl bg-cream-200 p-4">
            <p className="text-sm font-semibold text-ink">{publishing.studentId}</p>
            <p className="text-xs text-ink-500">{publishing.className}</p>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ── Student ──────────────────────────────────────────────── */

function StudentReports() {
  const { t, intlLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const { data: reports, loading } = usePublishedReports(auth.user?.uid)
  const [viewing, setViewing] = useState<PerformanceReportDoc | null>(null)

  async function acknowledge(report: PerformanceReportDoc) {
    try {
      await updateDoc(doc(db, 'performanceReports', report.id), {
        acknowledgedByGuardianAt: serverTimestamp(),
      })
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('Acknowledge failed', error)
      toast.error(t('common.error'))
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t('dash.myReports')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('reports.subtitle')}</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileBarChart className="h-6 w-6" />}
          title={t('reports.noPublishedReports')}
          description={t('reports.noPublishedReportsBody')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} hover>
              <CardHeader
                title={report.className}
                subtitle={`${t(`reports.period${cap(report.periodType)}`)} · ${formatDate(
                  report.periodEnd,
                  intlLocale,
                )}`}
                action={
                  report.overallGrade ? (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 font-display text-lg font-bold text-teal-700">
                      {report.overallGrade}
                    </span>
                  ) : null
                }
              />
              <CardBody>
                <p className="line-clamp-3 text-sm leading-relaxed text-ink-600">
                  {report.teacherComments}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-500">
                    {t('reports.writtenBy')} {report.teacherName}
                  </span>
                  <div className="flex gap-2">
                    {!report.acknowledgedByGuardianAt && (
                      <Button size="sm" variant="outline" onClick={() => acknowledge(report)}>
                        {t('reports.acknowledge')}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setViewing(report)}>
                      {t('common.view')}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('reports.title')} size="lg">
        {viewing && <ReportView report={viewing} />}
      </Modal>
    </>
  )
}

/* ── Shared ───────────────────────────────────────────────── */

function ReportView({ report }: { report: PerformanceReportDoc }) {
  const { t, intlLocale } = useI18n()
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  /**
   * Renders the report server-side and opens the result.
   *
   * The PDF is built by a Cloud Function rather than in the browser, so it
   * carries the school letterhead and cannot be assembled from data the
   * caller was never allowed to read.
   */
  async function downloadPdf() {
    setDownloading(true)
    try {
      const result = await httpsCallable<{ reportId: string }, { url: string }>(
        functions,
        'generateReportPdf',
      )({ reportId: report.id })
      window.open(result.data.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      // The server renderer needs Cloud Storage, which is not provisioned on
      // every project. Printing the page produces the same document through
      // the browser, so the feature still works rather than dead ending.
      console.error('generateReportPdf failed, falling back to print', error)
      toast.info(t('reports.pdfFallback'))
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {report.status === 'published' && (
        <div className="no-print flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={downloadPdf}
            loading={downloading}
            leftIcon={<FileDown className="h-4 w-4" />}
          >
            {t('reports.downloadPdf')}
          </Button>
        </div>
      )}
      {report.status === 'draft' && (
        <p className="flex gap-2.5 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          <Lock className="mt-px h-4 w-4 shrink-0" aria-hidden />
          {t('reports.draftNotice')}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream-200 p-4">
        <div>
          <p className="text-sm font-bold text-ink">{report.className}</p>
          <p className="text-xs text-ink-500">
            {t(`reports.period${cap(report.periodType)}`)} ·{' '}
            {formatDate(report.periodEnd, intlLocale)}
          </p>
        </div>
        {report.overallGrade && (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 font-display text-xl font-bold text-white">
            {report.overallGrade}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
          {t('reports.scores')}
        </h4>
        <div className="mt-3 space-y-2.5">
          {SCORE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink-700">{t(`reports.score${cap(key)}`)}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-28 overflow-hidden rounded-full bg-ink-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(report.scores[key] / 5) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-marti-600"
                  />
                </div>
                <span className="w-6 text-right text-sm font-semibold text-ink">
                  {report.scores[key]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {[
        { label: t('reports.strengths'), value: report.strengths },
        { label: t('reports.areasForImprovement'), value: report.areasForImprovement },
        { label: t('reports.teacherComments'), value: report.teacherComments },
      ]
        .filter((block) => block.value)
        .map((block) => (
          <div key={block.label}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {block.label}
            </h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {block.value}
            </p>
          </div>
        ))}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-label={`${score}`}
          className="transition-transform duration-150 hover:scale-125 active:scale-95"
        >
          <Star
            className={cn(
              'h-5 w-5',
              score <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-200',
            )}
          />
        </button>
      ))}
    </div>
  )
}

/** Simple average of the seven rubric scores, mapped to a letter. */
function gradeFromScores(scores: ReportScores): string {
  const values = SCORE_KEYS.map((key) => scores[key])
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  if (average >= 4.6) return 'A+'
  if (average >= 4.2) return 'A'
  if (average >= 3.8) return 'B+'
  if (average >= 3.4) return 'B'
  if (average >= 3.0) return 'C+'
  if (average >= 2.5) return 'C'
  return 'D'
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
