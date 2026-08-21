import { motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import {
  GraduationCap,
  KeyRound,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, StatCard } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { functions } from '@/lib/firebase'
import { useStaff } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { Role, UserDoc } from '@/types/models'

const ROLE_TONE: Record<Role, 'grape' | 'marti' | 'success' | 'gold'> = {
  director: 'grape',
  principal: 'marti',
  teacher: 'success',
  student: 'gold',
}

type TabValue = 'all' | 'staff' | 'students' | 'suspended'

/**
 * Account management for principals and directors.
 *
 * A principal can add teachers, suspend accounts and reset student passwords.
 * Only a director can change roles or touch another director, which matches
 * the boundary the Cloud Functions enforce server-side.
 */
export default function Staff() {
  const { t } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const isDirector = auth.role === 'director'

  const { data: users, loading } = useStaff()

  const [tab, setTab] = useState<TabValue>('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [changingRole, setChangingRole] = useState<UserDoc | null>(null)
  const [togglingStatus, setTogglingStatus] = useState<UserDoc | null>(null)
  const [resetting, setResetting] = useState<UserDoc | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [newRole, setNewRole] = useState<Role>('teacher')
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    tempPassword: string
  } | null>(null)

  const counts = useMemo(
    () => ({
      all: users.length,
      staff: users.filter((u) => u.role !== 'student').length,
      students: users.filter((u) => u.role === 'student').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
    }),
    [users],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users
      .filter((user) => {
        if (tab === 'staff') return user.role !== 'student'
        if (tab === 'students') return user.role === 'student'
        if (tab === 'suspended') return user.status === 'suspended'
        return true
      })
      .filter(
        (user) =>
          !term ||
          user.displayName?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.studentId?.toLowerCase().includes(term),
      )
      .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
  }, [users, tab, search])

  async function createStaff() {
    setBusy(true)
    try {
      const call = httpsCallable<
        { email: string; displayName: string; role: Role },
        { uid: string; tempPassword: string }
      >(functions, 'createStaffUser')
      const result = await call({
        email: email.trim(),
        displayName: displayName.trim(),
        role: newRole,
      })
      setCreatedCredentials({ email: email.trim(), tempPassword: result.data.tempPassword })
      toast.success(t('common.saved'))
    } catch (error) {
      console.error('createStaffUser failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function changeRole() {
    if (!changingRole) return
    setBusy(true)
    try {
      const call = httpsCallable<{ uid: string; role: Role }, { ok: true }>(functions, 'setUserRole')
      await call({ uid: changingRole.uid, role: newRole })
      toast.success(t('common.saved'))
      setChangingRole(null)
    } catch (error) {
      console.error('setUserRole failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus() {
    if (!togglingStatus) return
    setBusy(true)
    try {
      const call = httpsCallable<{ uid: string; status: 'active' | 'suspended' }, { ok: true }>(
        functions,
        'setUserStatus',
      )
      await call({
        uid: togglingStatus.uid,
        status: togglingStatus.status === 'active' ? 'suspended' : 'active',
      })
      toast.success(t('common.saved'))
      setTogglingStatus(null)
    } catch (error) {
      console.error('setUserStatus failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  async function resetStudentPassword() {
    if (!resetting?.studentId) return
    setBusy(true)
    try {
      const call = httpsCallable<{ studentId: string }, { tempPassword: string }>(
        functions,
        'adminResetStudentPassword',
      )
      const result = await call({ studentId: resetting.studentId })
      setNewPassword(result.data.tempPassword)
    } catch (error) {
      console.error('adminResetStudentPassword failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value)
    toast.success(t('common.copied'))
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('staff.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('staff.subtitle')}</p>
        </div>
        {isDirector && (
          <Button
            onClick={() => {
              setNewRole('teacher')
              setEmail('')
              setDisplayName('')
              setCreatedCredentials(null)
              setCreating(true)
            }}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            {t('staff.addStaff')}
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('staff.title')} value={counts.staff} icon={<UserCog className="h-5 w-5" />} />
        <StatCard
          label={t('dash.students')}
          value={counts.students}
          accent="gold"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          label={t('staff.statusActive')}
          value={counts.all - counts.suspended}
          accent="mint"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label={t('staff.statusSuspended')}
          value={counts.suspended}
          accent="coral"
          icon={<ShieldOff className="h-5 w-5" />}
        />
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: t('common.all'), count: counts.all },
            { value: 'staff', label: t('staff.title'), count: counts.staff },
            { value: 'students', label: t('dash.students'), count: counts.students },
            { value: 'suspended', label: t('staff.statusSuspended'), count: counts.suspended },
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
              <TableSkeleton rows={6} cols={4} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<Users className="h-6 w-6" />}
              title={t('staff.noStaff')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-extrabold">{t('common.name')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('common.email')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('staff.role')}</th>
                    <th className="px-5 py-3 font-extrabold">{t('common.status')}</th>
                    <th className="px-5 py-3 text-right font-extrabold">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visible.map((user, index) => {
                    const isSelf = user.uid === auth.user?.uid
                    // A principal must not be able to act on a director.
                    const locked = isSelf || (user.role === 'director' && !isDirector)

                    return (
                      <motion.tr
                        key={user.uid}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.25) }}
                        className={cn(
                          'transition-colors hover:bg-cream-200/70',
                          user.status === 'suspended' && 'opacity-60',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.displayName ?? ''} src={user.photoURL} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-ink">
                                {user.displayName}
                                {isSelf && (
                                  <span className="ml-2 text-xs font-semibold text-ink-400">
                                    ({t('messages.you')})
                                  </span>
                                )}
                              </p>
                              {user.studentId && (
                                <p className="font-mono text-xs text-ink-500">{user.studentId}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-ink-600">{user.email ?? '-'}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={ROLE_TONE[user.role]} size="sm">
                            {t(`staff.role${cap(user.role)}`)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            tone={user.status === 'active' ? 'success' : 'danger'}
                            size="sm"
                            dot
                          >
                            {user.status === 'active'
                              ? t('staff.statusActive')
                              : t('staff.statusSuspended')}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            {user.role === 'student' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t('students.resetPassword')}
                                onClick={() => {
                                  setNewPassword(null)
                                  setResetting(user)
                                }}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            )}
                            {isDirector && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t('staff.changeRole')}
                                disabled={locked}
                                onClick={() => {
                                  setNewRole(user.role)
                                  setChangingRole(user)
                                }}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              title={
                                user.status === 'active' ? t('staff.suspend') : t('staff.reactivate')
                              }
                              disabled={locked}
                              onClick={() => setTogglingStatus(user)}
                            >
                              {user.status === 'active' ? (
                                <ShieldOff className="h-4 w-4 text-magenta-600" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-teal-600" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add staff */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('staff.createStaffTitle')}
        description={createdCredentials ? undefined : t('staff.createStaffBody')}
        footer={
          createdCredentials ? (
            <Button onClick={() => setCreating(false)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={createStaff} loading={busy} disabled={!email || !displayName}>
                {t('common.save')}
              </Button>
            </>
          )
        }
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <CredentialRow
              label={t('common.email')}
              value={createdCredentials.email}
              onCopy={() => copy(createdCredentials.email)}
            />
            <CredentialRow
              label={t('reg.tempPassword')}
              value={createdCredentials.tempPassword}
              onCopy={() => copy(createdCredentials.tempPassword)}
            />
            <p className="rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
              {t('reg.passwordWarning')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label={t('settings.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              label={t('common.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select
              label={t('staff.role')}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              options={[
                { value: 'teacher', label: t('staff.roleTeacher') },
                { value: 'principal', label: t('staff.rolePrincipal') },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Change role */}
      <Modal
        open={!!changingRole}
        onClose={() => setChangingRole(null)}
        title={t('staff.changeRoleTitle')}
        description={t('staff.changeRoleBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setChangingRole(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={changeRole} loading={busy}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        {changingRole && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
              <Avatar name={changingRole.displayName ?? ''} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {changingRole.displayName}
                </p>
                <p className="truncate text-xs text-ink-500">{changingRole.email}</p>
              </div>
            </div>
            <Select
              label={t('staff.role')}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              options={[
                { value: 'teacher', label: t('staff.roleTeacher') },
                { value: 'principal', label: t('staff.rolePrincipal') },
                { value: 'director', label: t('staff.roleDirector') },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Suspend or reactivate */}
      <Modal
        open={!!togglingStatus}
        onClose={() => setTogglingStatus(null)}
        title={
          togglingStatus?.status === 'active' ? t('staff.suspendTitle') : t('staff.reactivate')
        }
        description={togglingStatus?.status === 'active' ? t('staff.suspendBody') : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTogglingStatus(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={togglingStatus?.status === 'active' ? 'danger' : 'primary'}
              onClick={toggleStatus}
              loading={busy}
            >
              {togglingStatus?.status === 'active' ? t('staff.suspend') : t('staff.reactivate')}
            </Button>
          </>
        }
      >
        {togglingStatus && (
          <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
            <Avatar name={togglingStatus.displayName ?? ''} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {togglingStatus.displayName}
              </p>
              <p className="truncate text-xs text-ink-500">
                {togglingStatus.email ?? togglingStatus.studentId}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset a student password */}
      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={t('students.resetPassword')}
        description={newPassword ? undefined : t('students.resetPasswordBody')}
        footer={
          newPassword ? (
            <Button onClick={() => setResetting(null)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetting(null)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={resetStudentPassword} loading={busy}>
                {t('students.resetPassword')}
              </Button>
            </>
          )
        }
      >
        {newPassword ? (
          <div className="space-y-4">
            <CredentialRow
              label={t('students.newPasswordIssued')}
              value={newPassword}
              onCopy={() => copy(newPassword)}
            />
            <p className="rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
              {t('reg.passwordWarning')}
            </p>
          </div>
        ) : (
          resetting && (
            <div className="flex items-center gap-3 rounded-2xl bg-cream-200 p-4">
              <Avatar name={resetting.displayName ?? ''} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{resetting.displayName}</p>
                <p className="truncate font-mono text-xs text-ink-500">{resetting.studentId}</p>
              </div>
            </div>
          )
        )}
      </Modal>
    </>
  )
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marti-50 text-marti-600">
        <KeyRound className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">{label}</p>
        <code className="mt-0.5 block truncate font-mono text-base font-bold text-ink">
          {value}
        </code>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy}>
        Copy
      </Button>
    </div>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
