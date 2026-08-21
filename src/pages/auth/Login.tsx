import { AnimatePresence, motion } from 'framer-motion'
import { FirebaseError } from 'firebase/app'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InvalidStudentIdError, useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { DEMO_ACCOUNTS, type DemoAccountKey } from '@/lib/demoAccounts'
import { currentSchoolYear } from '@/lib/schoolYear'
import { normalizeStudentId } from '@/lib/studentId'
import { cn } from '@/lib/utils'

const DEMO_ICONS = {
  director: ShieldCheck,
  principal: UserCog,
  teacher: Users,
  student: GraduationCap,
} as const

const DEMO_STYLES = {
  director: 'text-grape-600',
  principal: 'text-marti-600',
  teacher: 'text-teal-600',
  student: 'text-amber-600',
} as const

export default function Login() {
  const t = useT()
  const navigate = useNavigate()
  const auth = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState<string | null>(null)

  if (auth.status === 'authenticated') return <Navigate to="/app" replace />

  /**
   * One field for everyone. Anything containing an at sign is treated as a
   * staff email, anything else as a student ID. Families and staff both type
   * what they were given, with no tab to choose first.
   */
  const looksLikeEmail = identifier.includes('@')

  function describeError(err: unknown, staff: boolean): string {
    if (err instanceof InvalidStudentIdError) return t('auth.errorInvalidId')
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          return staff ? t('auth.errorWrongStaffCredentials') : t('auth.errorWrongCredentials')
        case 'auth/too-many-requests':
          return t('auth.errorTooMany')
        case 'auth/user-disabled':
          return t('auth.errorDisabled')
        default:
          return t('auth.errorGeneric')
      }
    }
    return t('auth.errorGeneric')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const entered = identifier.trim()
    if (!entered) return

    // Reject an unparseable student ID before spending a network round trip.
    if (!looksLikeEmail && !normalizeStudentId(entered, currentSchoolYear())) {
      setError(t('auth.errorInvalidId'))
      return
    }

    setBusy(true)
    try {
      if (looksLikeEmail) await auth.signInWithEmail(entered, password)
      else await auth.signInWithStudentId(entered, password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(describeError(err, looksLikeEmail))
    } finally {
      setBusy(false)
    }
  }

  async function handleDemo(key: DemoAccountKey) {
    const account = DEMO_ACCOUNTS[key]
    setError(null)
    setDemoBusy(key)
    try {
      if (account.role === 'student') {
        await auth.signInWithStudentId(account.identifier, account.password)
      } else {
        await auth.signInWithEmail(account.identifier, account.password)
      }
      navigate('/app', { replace: true })
    } catch (err) {
      setError(describeError(err, account.role !== 'student'))
    } finally {
      setDemoBusy(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel, hidden on small screens where it would only cost scroll. */}
      <div className="relative hidden w-1/2 overflow-hidden bg-marti-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-dots absolute inset-0 opacity-20" aria-hidden />
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -right-20 top-20 h-96 w-96 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative">
          <div className="inline-block rounded-2xl border-2 border-ink bg-white p-3 shadow-pop">
            <Logo size="md" linkTo="/" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative max-w-md text-white"
        >
          <h2 className="text-balance font-display text-4xl font-extrabold leading-tight">
            {t('brand.tagline')}
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-marti-100">
            {t('about.missionBody')}
          </p>
        </motion.div>

        <div className="relative flex gap-8 text-white">
          {[
            { value: '168', key: 'home.statStudents' },
            { value: '25', key: 'home.statTeachers' },
            { value: '22+', key: 'home.statYears' },
          ].map((stat) => (
            <div key={stat.key}>
              <p className="font-display text-2xl font-extrabold">{stat.value}</p>
              <p className="text-xs text-marti-200">{t(stat.key)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col bg-cream lg:w-1/2">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 transition-colors hover:text-marti-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('nav.home')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden">
              <Logo size="lg" linkTo="/" />
            </div>

            <h1 className="mt-6 font-display text-3xl font-extrabold text-ink lg:mt-0">
              {t('auth.loginTitle')}
            </h1>
            <p className="mt-2 text-sm text-ink-600">{t('auth.loginSubtitleUnified')}</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <Input
                label={t('auth.identifierLabel')}
                hint={t('auth.identifierHint')}
                placeholder={t('auth.identifierPlaceholder')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                leftIcon={<UserRound className="h-4 w-4" />}
                autoComplete="username"
                required
              />

              <Input
                label={t('auth.passwordLabel')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-ink-400 transition-colors hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border-2 border-ink bg-magenta-100 px-4 py-3 text-sm font-bold text-magenta-700"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-bold text-marti-600 transition-colors hover:text-marti-800"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={busy}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {busy ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <div className="h-0.5 flex-1 bg-ink-200" />
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('auth.demoTitle')}
                </span>
                <div className="h-0.5 flex-1 bg-ink-200" />
              </div>
              <p className="mt-3 text-center text-xs text-ink-500">{t('auth.demoSubtitle')}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {(Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[]).map((key) => {
                  const account = DEMO_ACCOUNTS[key]
                  const Icon = DEMO_ICONS[account.role]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDemo(key)}
                      disabled={demoBusy !== null}
                      className="press flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-white px-3.5 py-3 text-left disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream-200',
                          DEMO_STYLES[account.role],
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">
                          {t(`auth.demo${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                        </span>
                        <span className="block truncate text-[11px] text-ink-500">
                          {demoBusy === key ? t('auth.signingIn') : account.displayName}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-ink-600">
              {t('auth.noAccount')}{' '}
              <Link
                to="/#register"
                className="font-bold text-marti-600 transition-colors hover:text-marti-800"
              >
                {t('auth.registerLink')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
