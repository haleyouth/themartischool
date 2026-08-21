import { motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import {
  Copy,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { isAdminRole, useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { GRADE_LEVELS } from '@/lib/content'
import { functions } from '@/lib/firebase'
import { useClasses, useStudents } from '@/lib/hooks'
import { cn, fullName, percent } from '@/lib/utils'
import type { StudentDoc } from '@/types/models'

type TabValue = 'active' | 'inactive' | 'all'

interface StudentForm {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gradeLevel: string
  turkishLevel: string
  guardianName: string
  guardianEmail: string
  guardianPhone: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  medicalNotes: string
  classId: string
}

const EMPTY_FORM: StudentForm = {
  firstName: '',
  lastName: '',
  preferredName: '',
  dateOfBirth: '',
  gradeLevel: '',
  turkishLevel: 'beginner',
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  medicalNotes: '',
  classId: '',
}

export default function Students() {
  const { t } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const admin = isAdminRole(auth.role)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabValue>('active')
  const { data: students, loading } = useStudents()
  const { data: classes } = useClasses()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<StudentDoc | null>(null)
  const [removing, setRemoving] = useState<StudentDoc | null>(null)
  const [restoring, setRestoring] = useState<StudentDoc | null>(null)
  const [resetting, setResetting] = useState<StudentDoc | null>(null)
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  // Shown once after creating a student or resetting a password.
  const [credentials, setCredentials] = useState<{
    studentId: string
    tempPassword: string
  } | null>(null)

  const counts = useMemo(
    () => ({
      active: students.filter((s) => s.enrollmentStatus === 'active').length,
      inactive: students.filter((s) => s.enrollmentStatus !== 'active').length,
      all: students.length,
    }),
    [students],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return students
      .filter((s) => {
        if (tab === 'active') return s.enrollmentStatus === 'active'
        if (tab === 'inactive') return s.enrollmentStatus !== 'active'
        return true
      })
      .filter(
        (s) =>
          !term ||
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
          s.studentId.toLowerCase().includes(term) ||
          s.guardianEmail?.toLowerCase().includes(term),
      )
  }, [students, tab, search])

  function openCreate() {
    setForm(EMPTY_FORM)
    setCredentials(null)
    setCreating(true)
  }

  function openEdit(student: StudentDoc) {
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      preferredName: student.preferredName ?? '',
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      turkishLevel: student.turkishLevel ?? 'beginner',
      guardianName: student.guardianName,
      guardianEmail: student.guardianEmail,
      guardianPhone: student.guardianPhone,
      emergencyName: student.emergencyContact?.name ?? '',
      emergencyPhone: student.emergencyContact?.phone ?? '',
      emergencyRelationship: student.emergencyContact?.relationship ?? '',
      medicalNotes: student.medicalNotes ?? '',
      classId: '',
    })
    setEditing(student)
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value)
    toast.success(t('common.copied'))
  }

  async function createStudent() {
    setBusy(true)
    try {
      const result = await httpsCallable<
        Record<string, unknown>,
        { studentId: string; tempPassword: string }
      >(
        functions,
        'createStudent',
      )({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim() || null,
        dateOfBirth: form.dateOfBirth,
        gradeLevel: form.gradeLevel,
        turkishLevel: form.turkishLevel,
        guardian: {
          name: form.guardianName.trim(),
          email: form.guardianEmail.trim().toLowerCase(),
          phone: form.guardianPhone.trim(),
        },
        emergencyContact: {
          name: form.emergencyName.trim(),
          phone: form.emergencyPhone.trim(),
          relationship: form.emergencyRelationship.trim(),
        },
        medicalNotes: form.medicalNotes.trim() || null,
        ...(form.classId ? { classId: form.classId } : {}),
      })
      // The password is shown once and never stored, so the admin must copy
      // it now to hand over in person.
      setCredentials(result.data)
      toast.success(t('students.created'))
    } catch (error) {
      console.error('createStudent failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    setBusy(true)
    try {
      await httpsCallable(
        functions,
        'updateStudent',
      )({
        studentId: editing.studentId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim() || null,
        gradeLevel: form.gradeLevel,
        turkishLevel: form.turkishLevel,
        guardianName: form.guardianName.trim(),
        guardianEmail: form.guardianEmail.trim().toLowerCase(),
        guardianPhone: form.guardianPhone.trim(),
        medicalNotes: form.medicalNotes.trim() || null,
      })
      toast.success(t('common.saved'))
      setEditing(null)
    } catch (error) {
      console.error('updateStudent failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    try {
      // Archive, not erase: attendance and reports are the school's record.
      await httpsCallable(
        functions,
        'deleteStudent',
      )({ studentId: removing.studentId, permanent: false })
      toast.success(t('students.archived'))
      setRemoving(null)
    } catch (error) {
      console.error('deleteStudent failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRestore() {
    if (!restoring) return
    setBusy(true)
    try {
      await httpsCallable(functions, 'restoreStudent')({ studentId: restoring.studentId })
      toast.success(t('students.restored'))
      setRestoring(null)
    } catch (error) {
      console.error('restoreStudent failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmReset() {
    if (!resetting) return
    setBusy(true)
    try {
      const result = await httpsCallable<{ studentId: string }, { tempPassword: string }>(
        functions,
        'adminResetStudentPassword',
      )({ studentId: resetting.studentId })
      setCredentials({
        studentId: resetting.studentId,
        tempPassword: result.data.tempPassword,
      })
    } catch (error) {
      console.error('adminResetStudentPassword failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  const canSubmitNew =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.dateOfBirth &&
    form.gradeLevel &&
    form.guardianName.trim() &&
    form.guardianEmail.includes('@')

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('students.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('students.subtitle')}</p>
        </div>
        {admin && (
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            {t('students.addStudent')}
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'active', label: t('students.statusActive'), count: counts.active },
            { value: 'inactive', label: t('students.statusInactive'), count: counts.inactive },
            { value: 'all', label: t('common.all'), count: counts.all },
          ]}
        />
        <Input
          placeholder={t('students.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          wrapperClassName="w-full sm:w-72"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<GraduationCap className="h-6 w-6" />}
              title={t('students.noStudents')}
              description={t('students.noStudentsBody')}
              action={admin ? { label: t('students.addStudent'), onClick: openCreate } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-extrabold">{t('common.name')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('students.studentId')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('students.gradeLevel')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('students.attendanceRate')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('common.status')}</th>
                    {admin && (
                      <th className="px-5 py-3 text-right font-extrabold">
                        {t('common.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visible.map((student, index) => {
                    const summary = student.attendanceSummary
                    const rate = summary?.totalSessions
                      ? percent(summary.present + summary.late, summary.totalSessions)
                      : null
                    const archived = student.enrollmentStatus !== 'active'

                    return (
                      <motion.tr
                        key={student.studentId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.25) }}
                        className={cn(
                          'transition-colors hover:bg-cream-200/60',
                          archived && 'opacity-60',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/app/students/${student.studentId}`}
                            className="group flex items-center gap-3"
                          >
                            <Avatar
                              name={fullName(student.firstName, student.lastName)}
                              size="sm"
                            />
                            <span className="font-bold text-ink transition-colors group-hover:text-marti-700">
                              {fullName(
                                student.firstName,
                                student.lastName,
                                student.preferredName,
                              )}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-ink-600">
                          {student.studentId}
                        </td>
                        <td className="px-5 py-3.5 text-ink-600">{student.gradeLevel}</td>
                        <td className="px-5 py-3.5">
                          {rate === null ? (
                            <span className="text-xs text-ink-400">-</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    rate >= 90
                                      ? 'bg-teal-500'
                                      : rate >= 75
                                        ? 'bg-amber-500'
                                        : 'bg-magenta-500',
                                  )}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-ink-700">{rate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={statusTone(student.enrollmentStatus)} size="sm">
                            {t(`students.status${cap(student.enrollmentStatus)}`)}
                          </Badge>
                        </td>
                        {admin && (
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t('common.edit')}
                                aria-label={t('common.edit')}
                                onClick={() => openEdit(student)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t('students.resetPassword')}
                                aria-label={t('students.resetPassword')}
                                onClick={() => {
                                  setCredentials(null)
                                  setResetting(student)
                                }}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              {archived ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={t('students.restore')}
                                  aria-label={t('students.restore')}
                                  onClick={() => setRestoring(student)}
                                >
                                  <RotateCcw className="h-4 w-4 text-teal-600" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={t('students.archive')}
                                  aria-label={t('students.archive')}
                                  onClick={() => setRemoving(student)}
                                >
                                  <Trash2 className="h-4 w-4 text-magenta-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add a student */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('students.addStudent')}
        description={credentials ? undefined : t('students.addStudentBody')}
        size="lg"
        closeOnBackdrop={!credentials}
        footer={
          credentials ? (
            <Button onClick={() => setCreating(false)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={createStudent} loading={busy} disabled={!canSubmitNew}>
                {t('students.createAccount')}
              </Button>
            </>
          )
        }
      >
        {credentials ? (
          <IssuedCredentials credentials={credentials} onCopy={copy} />
        ) : (
          <StudentFields form={form} setForm={setForm} classes={classes} showClass />
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t('students.editStudent')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdit} loading={busy}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <StudentFields form={form} setForm={setForm} classes={classes} />
      </Modal>

      {/* Archive */}
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={t('students.archiveTitle')}
        description={t('students.archiveBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRemove} loading={busy}>
              {t('students.archive')}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
              <Avatar name={fullName(removing.firstName, removing.lastName)} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {fullName(removing.firstName, removing.lastName)}
                </p>
                <p className="truncate font-mono text-xs text-ink-500">{removing.studentId}</p>
              </div>
            </div>
            <p className="flex gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
              <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden />
              {t('students.archiveNote')}
            </p>
          </div>
        )}
      </Modal>

      {/* Restore */}
      <Modal
        open={!!restoring}
        onClose={() => setRestoring(null)}
        title={t('students.restoreTitle')}
        description={t('students.restoreBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoring(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmRestore} loading={busy}>
              {t('students.restore')}
            </Button>
          </>
        }
      >
        {restoring && (
          <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
            <Avatar name={fullName(restoring.firstName, restoring.lastName)} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {fullName(restoring.firstName, restoring.lastName)}
              </p>
              <p className="truncate font-mono text-xs text-ink-500">{restoring.studentId}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={t('students.resetPassword')}
        description={credentials ? undefined : t('students.resetPasswordBody')}
        closeOnBackdrop={!credentials}
        footer={
          credentials ? (
            <Button onClick={() => setResetting(null)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetting(null)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={confirmReset} loading={busy}>
                {t('students.resetPassword')}
              </Button>
            </>
          )
        }
      >
        {credentials ? (
          <IssuedCredentials credentials={credentials} onCopy={copy} />
        ) : (
          resetting && (
            <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
              <Avatar name={fullName(resetting.firstName, resetting.lastName)} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {fullName(resetting.firstName, resetting.lastName)}
                </p>
                <p className="truncate font-mono text-xs text-ink-500">{resetting.studentId}</p>
              </div>
            </div>
          )
        )}
      </Modal>
    </>
  )
}

/** Shared field set for both adding and editing a student. */
function StudentFields({
  form,
  setForm,
  classes,
  showClass = false,
}: {
  form: StudentForm
  setForm: (form: StudentForm) => void
  classes: { id: string; name: string; enrolledCount: number; capacity: number }[]
  showClass?: boolean
}) {
  const { t } = useI18n()
  const set = (patch: Partial<StudentForm>) => setForm({ ...form, ...patch })

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('register.firstName')}
          required
          value={form.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
        />
        <Input
          label={t('register.lastName')}
          required
          value={form.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('register.preferredName')}
          value={form.preferredName}
          onChange={(e) => set({ preferredName: e.target.value })}
        />
        <div>
          <label htmlFor="student-dob" className="mb-1.5 block text-sm font-bold text-ink-700">
            {t('register.dateOfBirth')}
          </label>
          <input
            id="student-dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            className="h-11 w-full rounded-2xl border-2 border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink transition-colors focus:border-marti-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('students.gradeLevel')}
          required
          value={form.gradeLevel}
          onChange={(e) => set({ gradeLevel: e.target.value })}
        >
          <option value="">{t('common.none')}</option>
          {GRADE_LEVELS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </Select>
        <Select
          label={t('register.turkishLevel')}
          value={form.turkishLevel}
          onChange={(e) => set({ turkishLevel: e.target.value })}
          options={[
            { value: 'none', label: t('register.turkishNone') },
            { value: 'beginner', label: t('register.turkishBeginner') },
            { value: 'intermediate', label: t('register.turkishIntermediate') },
            { value: 'fluent', label: t('register.turkishFluent') },
            { value: 'heritage', label: t('register.turkishHeritage') },
          ]}
        />
      </div>

      {showClass && (
        <Select
          label={t('reg.assignClass')}
          hint={t('reg.assignClassOptional')}
          value={form.classId}
          onChange={(e) => set({ classId: e.target.value })}
        >
          <option value="">{t('common.none')}</option>
          {classes
            .filter((c) => c.enrolledCount < c.capacity)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.enrolledCount}/{c.capacity})
              </option>
            ))}
        </Select>
      )}

      <div className="rounded-3xl border-2 border-ink-100 p-5">
        <p className="text-sm font-bold text-ink">{t('reg.guardianInfo')}</p>
        <div className="mt-4 space-y-4">
          <Input
            label={t('register.guardianName')}
            required
            value={form.guardianName}
            onChange={(e) => set({ guardianName: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('register.guardianEmail')}
              type="email"
              required
              value={form.guardianEmail}
              onChange={(e) => set({ guardianEmail: e.target.value })}
            />
            <Input
              label={t('register.guardianPhone')}
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => set({ guardianPhone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-magenta-200 bg-magenta-50/40 p-5">
        <p className="text-sm font-bold text-ink">{t('register.emergencyTitle')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input
            label={t('register.emergencyName')}
            value={form.emergencyName}
            onChange={(e) => set({ emergencyName: e.target.value })}
          />
          <Input
            label={t('register.emergencyPhone')}
            type="tel"
            value={form.emergencyPhone}
            onChange={(e) => set({ emergencyPhone: e.target.value })}
          />
          <Input
            label={t('register.emergencyRelationship')}
            value={form.emergencyRelationship}
            onChange={(e) => set({ emergencyRelationship: e.target.value })}
          />
        </div>
      </div>

      <Textarea
        label={t('register.medicalNotes')}
        hint={t('register.medicalNotesHint')}
        rows={2}
        value={form.medicalNotes}
        onChange={(e) => set({ medicalNotes: e.target.value })}
      />
    </div>
  )
}

/** The student ID and one time password, shown once for handover. */
function IssuedCredentials({
  credentials,
  onCopy,
}: {
  credentials: { studentId: string; tempPassword: string }
  onCopy: (value: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      {[
        { label: t('reg.studentIdIssued'), value: credentials.studentId },
        { label: t('reg.tempPassword'), value: credentials.tempPassword },
      ].map((row) => (
        <div
          key={row.label}
          className="flex items-center gap-3 rounded-2xl border-2 border-ink-200 bg-white p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marti-50 text-marti-600">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
              {row.label}
            </p>
            <code className="mt-0.5 block truncate font-mono text-base font-bold text-ink">
              {row.value}
            </code>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(row.value)}
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            {t('common.copy')}
          </Button>
        </div>
      ))}

      <p className="flex gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
        <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden />
        {t('reg.passwordWarning')}
      </p>
    </div>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
