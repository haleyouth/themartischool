import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { updatePassword } from 'firebase/auth'
import { Bell, Lock, Save, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { auth as fbAuth, db } from '@/lib/firebase'
import { cn } from '@/lib/utils'
import type { Locale, NotificationPrefs } from '@/types/models'

const PREF_KEYS: { key: keyof NotificationPrefs; labelKey: string }[] = [
  { key: 'inApp', labelKey: 'settings.notifyInApp' },
  { key: 'email', labelKey: 'settings.notifyEmail' },
  { key: 'attendanceAlerts', labelKey: 'settings.notifyAttendance' },
  { key: 'reportPublished', labelKey: 'settings.notifyReports' },
  { key: 'newMessage', labelKey: 'settings.notifyMessages' },
]

export default function Settings() {
  const { t, locale, setLocale } = useI18n()
  const auth = useAuth()
  const toast = useToast()

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email: true,
    inApp: true,
    attendanceAlerts: true,
    reportPublished: true,
    newMessage: true,
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  // Hydrate the form once the profile arrives.
  useEffect(() => {
    if (!auth.profile) return
    setDisplayName(auth.profile.displayName ?? '')
    setPhone(auth.profile.phone ?? '')
    if (auth.profile.notificationPrefs) setPrefs(auth.profile.notificationPrefs)
  }, [auth.profile])

  async function saveProfile() {
    if (!auth.user) return
    setSavingProfile(true)
    try {
      await updateDoc(doc(db, 'users', auth.user.uid), {
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        locale,
        notificationPrefs: prefs,
        updatedAt: serverTimestamp(),
      })
      toast.success(t('settings.savedSuccess'))
    } catch (error) {
      console.error('Save settings failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword() {
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError(t('auth.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    try {
      await updatePassword(fbAuth.currentUser!, newPassword)
      // Clearing the flag lets the app stop nagging for a password change.
      if (auth.user) {
        await updateDoc(doc(db, 'users', auth.user.uid), {
          mustChangePassword: false,
          updatedAt: serverTimestamp(),
        }).catch(() => undefined)
      }
      toast.success(t('auth.passwordUpdated'))
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Change password failed', error)
      // Firebase requires a recent sign-in for this operation.
      setPasswordError(t('auth.errorGeneric'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t('settings.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('settings.subtitle')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-marti-600" />
                {t('settings.profileTitle')}
              </span>
            }
          />
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={auth.profile?.displayName ?? '-'}
                src={auth.profile?.photoURL}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {auth.profile?.email ?? auth.profile?.studentId ?? '-'}
                </p>
                <p className="text-xs text-ink-500">
                  {t(`staff.role${cap(auth.role ?? 'student')}`)}
                </p>
              </div>
            </div>

            <Input
              label={t('settings.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label={t('common.phone')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Select
              label={t('settings.language')}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              options={[
                { value: 'en', label: t('settings.languageEn') },
                { value: 'tr', label: t('settings.languageTr') },
              ]}
            />

            <Button
              onClick={saveProfile}
              loading={savingProfile}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {t('common.save')}
            </Button>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-marti-600" />
                  {t('settings.notificationsTitle')}
                </span>
              }
            />
            <CardBody className="space-y-1">
              {PREF_KEYS.map((pref) => (
                <label
                  key={pref.key}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-2.5 transition-colors hover:bg-cream-200"
                >
                  <span className="text-sm text-ink-700">{t(pref.labelKey)}</span>
                  {/*
                    Track is 44px with a 2px border, so the usable inner width
                    is 40px. A 20px knob therefore travels exactly 20px. Using
                    a rem guess here let the knob overhang the right edge.
                  */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[pref.key]}
                    aria-label={t(pref.labelKey)}
                    onClick={() =>
                      setPrefs((prev) => ({ ...prev, [pref.key]: !prev[pref.key] }))
                    }
                    className={cn(
                      'relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors duration-200',
                      prefs[pref.key] ? 'bg-marti-600' : 'bg-ink-100',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-0 h-5 w-5 rounded-full bg-white transition-transform duration-200',
                        prefs[pref.key] ? 'translate-x-5' : 'translate-x-0',
                      )}
                    />
                  </button>
                </label>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-marti-600" />
                  {t('settings.securityTitle')}
                </span>
              }
            />
            <CardBody className="space-y-4">
              <Input
                label={t('auth.newPassword')}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                label={t('auth.confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordError ?? undefined}
                autoComplete="new-password"
              />
              <Button
                variant="outline"
                onClick={changePassword}
                loading={savingPassword}
                disabled={!newPassword || !confirmPassword}
              >
                {t('auth.updatePassword')}
              </Button>
            </CardBody>
          </Card>

        </div>
      </div>
    </>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
