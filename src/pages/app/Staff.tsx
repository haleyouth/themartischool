import { motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { functions } from '@/lib/firebase'
import { useStaff } from '@/lib/hooks'
import type { Role, UserDoc } from '@/types/models'

const ROLE_TONE: Record<Role, 'violet' | 'marti' | 'success' | 'gold'> = {
  director: 'violet',
  principal: 'marti',
  teacher: 'success',
  student: 'gold',
}

export default function Staff() {
  const { t } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const isDirector = auth.role === 'director'

  const { data: users, loading } = useStaff()

  const [creating, setCreating] = useState(false)
  const [changingRole, setChangingRole] = useState<UserDoc | null>(null)
  const [suspending, setSuspending] = useState<UserDoc | null>(null)
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [newRole, setNewRole] = useState<Role>('teacher')

  // Students have their own page; this one is about the people who run the school.
  const staff = useMemo(() => users.filter((user) => user.role !== 'student'), [users])

  async function createStaff() {
    setBusy(true)
    try {
      const call = httpsCallable<
        { email: string; displayName: string; role: Role },
        { uid: string }
      >(functions, 'createStaffUser')
      await call({ email: email.trim(), displayName: displayName.trim(), role: newRole })
      toast.success(t('common.saved'))
      setCreating(false)
      setEmail('')
      setDisplayName('')
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
      const call = httpsCallable<{ uid: string; role: Role }, { ok: true }>(
        functions,
        'setUserRole',
      )
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

  async function toggleStatus(user: UserDoc) {
    setBusy(true)
    try {
      const call = httpsCallable<{ uid: string; status: 'active' | 'suspended' }, { ok: true }>(
        functions,
        'setUserStatus',
      )
      await call({
        uid: user.uid,
        status: user.status === 'active' ? 'suspended' : 'active',
      })
      toast.success(t('common.saved'))
      setSuspending(null)
    } catch (error) {
      console.error('setUserStatus failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{t('staff.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('staff.subtitle')}</p>
        </div>
        {isDirector && (
          <Button
            onClick={() => {
              setNewRole('teacher')
              setCreating(true)
            }}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            {t('staff.addStaff')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<Users className="h-6 w-6" />}
              title={t('staff.noStaff')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('common.name')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.email')}</th>
                    <th className="px-5 py-3 font-semibold">{t('staff.role')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.status')}</th>
                    {isDirector && (
                      <th className="px-5 py-3 text-right font-semibold">
                        {t('common.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {staff.map((user, index) => (
                    <motion.tr
                      key={user.uid}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="transition-colors hover:bg-ink-50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.displayName} src={user.photoURL} size="sm" />
                          <span className="font-semibold text-ink-900">{user.displayName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{user.email ?? '—'}</td>
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
                      {isDirector && (
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={user.uid === auth.user?.uid}
                              onClick={() => {
                                setNewRole(user.role)
                                setChangingRole(user)
                              }}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={user.uid === auth.user?.uid}
                              onClick={() => setSuspending(user)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create staff */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t('staff.createStaffTitle')}
        description={t('staff.createStaffBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={createStaff} loading={busy} disabled={!email || !displayName}>
              {t('common.save')}
            </Button>
          </>
        }
      >
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
            <div className="rounded-xl bg-ink-50 p-4">
              <p className="text-sm font-semibold text-ink-900">{changingRole.displayName}</p>
              <p className="text-xs text-ink-500">{changingRole.email}</p>
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

      {/* Suspend / reactivate */}
      <Modal
        open={!!suspending}
        onClose={() => setSuspending(null)}
        title={
          suspending?.status === 'active' ? t('staff.suspendTitle') : t('staff.reactivate')
        }
        description={suspending?.status === 'active' ? t('staff.suspendBody') : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspending(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={suspending?.status === 'active' ? 'danger' : 'primary'}
              onClick={() => suspending && toggleStatus(suspending)}
              loading={busy}
            >
              {suspending?.status === 'active' ? t('staff.suspend') : t('staff.reactivate')}
            </Button>
          </>
        }
      >
        {suspending && (
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">{suspending.displayName}</p>
            <p className="text-xs text-ink-500">{suspending.email}</p>
          </div>
        )}
      </Modal>
    </>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
