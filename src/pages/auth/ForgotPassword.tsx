import { motion } from 'framer-motion'
import { sendPasswordResetEmail } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { ArrowLeft, CheckCircle2, IdCard, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { useT } from '@/i18n'
import { auth, functions } from '@/lib/firebase'
import { normalizeStudentId } from '@/lib/studentId'
import { currentSchoolYear } from '@/lib/schoolYear'

export default function ForgotPassword() {
  const t = useT()
  const [tab, setTab] = useState<'student' | 'staff'>('student')
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      if (tab === 'student') {
        const canonical = normalizeStudentId(value, currentSchoolYear())
        if (!canonical) {
          setError(t('auth.errorInvalidId'))
          return
        }
        // A student's shadow address is not a real inbox, so the reset link is
        // emailed to the guardian address on file by a Cloud Function.
        const call = httpsCallable<{ studentId: string }, { ok: true }>(
          functions,
          'requestStudentPasswordReset',
        )
        await call({ studentId: canonical })
      } else {
        await sendPasswordResetEmail(auth, value.trim())
      }
      // Always report success so the form cannot be used to discover accounts.
      setSent(true)
    } catch (err) {
      console.error('Password reset failed', err)
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-marti-50 to-white">
      <div className="flex items-center justify-between p-5 sm:p-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-marti-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToLogin')}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-7 shadow-card sm:p-8"
        >
          <Logo size="md" />

          {sent ? (
            <div className="mt-8 flex flex-col items-center text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white"
              >
                <CheckCircle2 className="h-7 w-7" />
              </motion.span>
              <h1 className="mt-5 font-display text-xl font-bold text-ink-950">
                {t('auth.resetSentTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {t('auth.resetSentBody')}
              </p>
              <Button to="/login" variant="outline" className="mt-6">
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-7 font-display text-2xl font-bold text-ink-950">
                {t('auth.forgotTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {tab === 'student'
                  ? t('auth.forgotSubtitleStudent')
                  : t('auth.forgotSubtitleStaff')}
              </p>

              <div className="mt-6">
                <Tabs
                  variant="pills"
                  value={tab}
                  onChange={(next) => {
                    setTab(next)
                    setValue('')
                    setError(null)
                  }}
                  items={[
                    { value: 'student', label: t('auth.studentTab') },
                    { value: 'staff', label: t('auth.staffTab') },
                  ]}
                />
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {tab === 'student' ? (
                  <Input
                    label={t('auth.studentIdLabel')}
                    placeholder={t('auth.studentIdPlaceholder')}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    leftIcon={<IdCard className="h-4 w-4" />}
                    error={error ?? undefined}
                    required
                  />
                ) : (
                  <Input
                    label={t('auth.emailLabel')}
                    type="email"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    error={error ?? undefined}
                    required
                  />
                )}

                <Button type="submit" size="lg" fullWidth loading={busy}>
                  {t('auth.sendResetLink')}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
