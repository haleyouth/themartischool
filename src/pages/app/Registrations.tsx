import { motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  KeyRound,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { GRADE_LEVELS } from '@/lib/content'
import { functions } from '@/lib/firebase'
import { useClasses, useRegistrations } from '@/lib/hooks'
import { formatDate, formatRelative, fullName } from '@/lib/utils'
import type { RegistrationDoc } from '@/types/models'

type StatusFilter = 'pending' | 'under_review' | 'approved' | 'rejected' | 'waitlisted'

interface ApproveResult {
  studentId: string
  tempPassword: string
  uid: string
}

export default function Registrations() {
  const { t, intlLocale } = useI18n()
  const toast = useToast()

  const [tab, setTab] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<RegistrationDoc | null>(null)
  const [approving, setApproving] = useState<RegistrationDoc | null>(null)
  const [rejecting, setRejecting] = useState<RegistrationDoc | null>(null)

  const [gradeLevel, setGradeLevel] = useState('')
  const [classId, setClassId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [credentials, setCredentials] = useState<ApproveResult | null>(null)

  const { data: all, loading } = useRegistrations()
  const { data: classes } = useClasses()

  const counts = useMemo(() => {
    const by: Record<string, number> = {}
    for (const item of all) by[item.status] = (by[item.status] ?? 0) + 1
    return by
  }, [all])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return all
      .filter((item) => item.status === tab)
      .filter(
        (item) =>
          !term ||
          `${item.firstName} ${item.lastName}`.toLowerCase().includes(term) ||
          item.guardianEmail.toLowerCase().includes(term),
      )
  }, [all, tab, search])

  function openApprove(registration: RegistrationDoc) {
    setApproving(registration)
    setGradeLevel(registration.requestedGradeLevel || '')
    setClassId('')
    setCredentials(null)
  }

  async function confirmApprove() {
    if (!approving || !gradeLevel) return
    setBusy(true)
    try {
      const call = httpsCallable<
        { registrationId: string; gradeLevel: string; classId?: string },
        ApproveResult
      >(functions, 'approveRegistration')

      const result = await call({
        registrationId: approving.id,
        gradeLevel,
        ...(classId ? { classId } : {}),
      })

      // The password is shown once and never persisted, the admin hands it over.
      setCredentials(result.data)
      toast.success(t('reg.approvedTitle'))
    } catch (error) {
      console.error('approveRegistration failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmReject() {
    if (!rejecting) return
    setBusy(true)
    try {
      const call = httpsCallable<{ registrationId: string; reason: string }, { ok: true }>(
        functions,
        'rejectRegistration',
      )
      await call({ registrationId: rejecting.id, reason: rejectReason })
      toast.success(t('reg.rejected'))
      setRejecting(null)
      setRejectReason('')
    } catch (error) {
      console.error('rejectRegistration failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success(t('common.copied'))
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t('reg.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('reg.subtitle')}</p>
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'pending', label: t('reg.pending'), count: counts.pending ?? 0 },
            {
              value: 'under_review',
              label: t('reg.underReview'),
              count: counts.under_review ?? 0,
            },
            { value: 'approved', label: t('reg.approved'), count: counts.approved ?? 0 },
            { value: 'waitlisted', label: t('reg.waitlisted'), count: counts.waitlisted ?? 0 },
            { value: 'rejected', label: t('reg.rejected'), count: counts.rejected ?? 0 },
          ]}
        />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          wrapperClassName="sm:w-64"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<ClipboardList className="h-6 w-6" />}
              title={t('reg.noRegistrations')}
              description={t('reg.noRegistrationsBody')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('reg.applicant')}</th>
                    <th className="px-5 py-3 font-semibold">{t('reg.guardian')}</th>
                    <th className="px-5 py-3 font-semibold">{t('reg.grade')}</th>
                    <th className="px-5 py-3 font-semibold">{t('reg.submitted')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.status')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visible.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="transition-colors hover:bg-cream-200"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink">
                          {fullName(item.firstName, item.lastName, item.preferredName)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {formatDate(item.dateOfBirth, intlLocale)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-ink-800">{item.guardianName}</p>
                        <p className="truncate text-xs text-ink-500">{item.guardianEmail}</p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{item.requestedGradeLevel}</td>
                      <td className="px-5 py-3.5 text-xs text-ink-500">
                        {formatRelative(item.submittedAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(item.status)} size="sm">
                          {item.assignedStudentId ?? t(`reg.${camel(item.status)}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetail(item)}
                            aria-label={t('common.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(item.status === 'pending' ||
                            item.status === 'under_review' ||
                            item.status === 'waitlisted') && (
                            <>
                              <Button size="sm" onClick={() => openApprove(item)}>
                                {t('reg.approve')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setRejecting(item)}
                                aria-label={t('reg.reject')}
                              >
                                <X className="h-4 w-4 text-magenta-600" />
                              </Button>
                            </>
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

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={t('reg.applicationDetail')}
        size="lg"
      >
        {detail && (
          <div className="space-y-6">
            <DetailGroup
              title={t('reg.studentInfo')}
              rows={[
                [t('common.name'), fullName(detail.firstName, detail.lastName, detail.preferredName)],
                [t('register.dateOfBirth'), formatDate(detail.dateOfBirth, intlLocale)],
                [t('reg.grade'), detail.requestedGradeLevel],
                [t('reg.turkishLevel'), detail.turkishLevel],
              ]}
            />
            <DetailGroup
              title={t('reg.guardianInfo')}
              rows={[
                [t('common.name'), detail.guardianName],
                [t('common.email'), detail.guardianEmail],
                [t('common.phone'), detail.guardianPhone],
                [
                  t('register.emergencyTitle'),
                  `${detail.emergencyContact.name} · ${detail.emergencyContact.phone} (${detail.emergencyContact.relationship})`,
                ],
              ]}
            />
            <DetailGroup
              title={t('reg.healthInfo')}
              rows={[
                [t('register.medicalNotes'), detail.medicalNotes || '-'],
                [t('register.allergies'), detail.allergies || '-'],
                [t('register.photoConsent'), detail.photoConsent ? t('common.yes') : t('common.no')],
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Approve */}
      <Modal
        open={!!approving}
        onClose={() => {
          setApproving(null)
          setCredentials(null)
        }}
        closeOnBackdrop={!credentials}
        title={credentials ? t('reg.approvedTitle') : t('reg.approveTitle')}
        description={credentials ? t('reg.approvedBody') : t('reg.approveBody')}
        footer={
          credentials ? (
            <Button
              onClick={() => {
                setApproving(null)
                setCredentials(null)
              }}
            >
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setApproving(null)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={confirmApprove} loading={busy} disabled={!gradeLevel}>
                {busy ? t('reg.approving') : t('reg.confirmApprove')}
              </Button>
            </>
          )
        }
      >
        {credentials ? (
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center rounded-2xl bg-teal-50 py-8"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white">
                <CheckCircle2 className="h-7 w-7" />
              </span>
            </motion.div>

            <CredentialRow
              label={t('reg.studentIdIssued')}
              value={credentials.studentId}
              onCopy={() => copy(credentials.studentId)}
              icon={<BadgeCheck className="h-4 w-4" />}
            />
            <CredentialRow
              label={t('reg.tempPassword')}
              value={credentials.tempPassword}
              onCopy={() => copy(credentials.tempPassword)}
              icon={<KeyRound className="h-4 w-4" />}
            />

            <p className="flex gap-2.5 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden />
              {t('reg.passwordWarning')}
            </p>
          </div>
        ) : (
          approving && (
            <div className="space-y-5">
              <div className="rounded-xl bg-cream-200 p-4">
                <p className="text-sm font-semibold text-ink">
                  {fullName(approving.firstName, approving.lastName)}
                </p>
                <p className="text-xs text-ink-500">{approving.guardianEmail}</p>
              </div>

              <Select
                label={t('reg.assignGrade')}
                required
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="">{t('common.none')}</option>
                {GRADE_LEVELS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </Select>

              <Select
                label={t('reg.assignClass')}
                hint={t('reg.assignClassOptional')}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">{t('common.none')}</option>
                {classes
                  .filter((cls) => cls.status === 'active' && cls.enrolledCount < cls.capacity)
                  .map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.enrolledCount}/{cls.capacity})
                    </option>
                  ))}
              </Select>
            </div>
          )
        )}
      </Modal>

      {/* Reject */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={t('reg.rejectTitle')}
        description={t('reg.rejectBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmReject} loading={busy}>
              {t('reg.confirmReject')}
            </Button>
          </>
        }
      >
        <Textarea
          label={t('reg.rejectReason')}
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </>
  )
}

function camel(status: string) {
  const [first, ...rest] = status.split('_')
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

function DetailGroup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</h3>
      <dl className="mt-3 space-y-2.5 rounded-xl border-2 border-ink p-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="shrink-0 text-ink-500">{label}</dt>
            <dd className="text-right font-medium text-ink-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function CredentialRow({
  label,
  value,
  onCopy,
  icon,
}: {
  label: string
  value: string
  onCopy: () => void
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marti-50 text-marti-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        <code className="mt-0.5 block truncate font-mono text-base font-bold text-ink">
          {value}
        </code>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}
