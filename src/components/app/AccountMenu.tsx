import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronsUpDown,
  Check,
  GraduationCap,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { DEMO_ACCOUNTS, type DemoAccountKey } from '@/lib/demoAccounts'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/models'

const ROLE_META: Record<Role, { icon: typeof ShieldCheck; tone: 'grape' | 'marti' | 'mint' | 'sunshine' }> = {
  director: { icon: ShieldCheck, tone: 'grape' },
  principal: { icon: UserCog, tone: 'marti' },
  teacher: { icon: Users, tone: 'mint' },
  student: { icon: GraduationCap, tone: 'sunshine' },
}

const ROLE_LABEL: Record<Role, string> = {
  director: 'staff.roleDirector',
  principal: 'staff.rolePrincipal',
  teacher: 'staff.roleTeacher',
  student: 'staff.roleStudent',
}

/**
 * Account menu with a working demo account switcher.
 *
 * Switching genuinely signs out and signs back in as the other demo account,
 * so the new session carries that role's real custom claims. Anything less
 * would show a role's screens without its actual permissions, which would be
 * misleading when demonstrating the system.
 */
export function AccountMenu() {
  const t = useT()
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<DemoAccountKey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const role = auth.role ?? 'student'
  const displayName = auth.profile?.displayName ?? auth.user?.email ?? ''
  const RoleIcon = ROLE_META[role].icon

  /** True when the signed-in account is one of the seeded demo accounts. */
  const currentDemoKey = (Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[]).find((key) => {
    const account = DEMO_ACCOUNTS[key]
    return account.role === 'student'
      ? auth.claims?.studentId === account.identifier
      : auth.profile?.email === account.identifier
  })

  async function switchTo(key: DemoAccountKey) {
    if (key === currentDemoKey) {
      setOpen(false)
      return
    }

    const account = DEMO_ACCOUNTS[key]
    setSwitching(key)
    try {
      // Sign out first so the new session starts with a clean token, then sign
      // in so the claims belong to the account we are switching to.
      await auth.signOut()
      if (account.role === 'student') {
        await auth.signInWithStudentId(account.identifier, account.password)
      } else {
        await auth.signInWithEmail(account.identifier, account.password)
      }
      setOpen(false)
      navigate('/app', { replace: true })
      toast.success(t('auth.demoTitle'), account.displayName)
    } catch (error) {
      console.error('Account switch failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
      navigate('/login', { replace: true })
    } finally {
      setSwitching(null)
    }
  }

  async function handleSignOut() {
    await auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('a11y.userMenu')}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-2.5 shadow-soft ring-2 ring-cream-200 transition-all hover:ring-marti-200"
      >
        <Avatar name={displayName} src={auth.profile?.photoURL} size="sm" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[9rem] truncate text-xs font-bold text-ink-900">
            {displayName}
          </span>
          <span className="block text-[11px] font-semibold text-ink-500">
            {t(ROLE_LABEL[role])}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border-2 border-cream-200 bg-white shadow-card"
          >
            <div className="flex items-center gap-3 bg-cream-100 p-4">
              <Avatar name={displayName} src={auth.profile?.photoURL} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink-950">{displayName}</p>
                <p className="truncate text-xs text-ink-500">
                  {auth.profile?.email ?? auth.profile?.studentId ?? ''}
                </p>
              </div>
              <Badge tone={ROLE_META[role].tone} size="sm">
                <RoleIcon className="h-3 w-3" />
                {t(ROLE_LABEL[role])}
              </Badge>
            </div>

            {/* Demo account switcher, only shown when signed in as a demo user. */}
            {currentDemoKey && (
              <div className="border-t-2 border-cream-200 p-2">
                <p className="px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-400">
                  {t('auth.demoTitle')}
                </p>
                <ul className="space-y-1">
                  {(Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[]).map((key) => {
                    const account = DEMO_ACCOUNTS[key]
                    const Icon = ROLE_META[account.role].icon
                    const isCurrent = key === currentDemoKey
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => switchTo(key)}
                          disabled={switching !== null}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors disabled:opacity-60',
                            isCurrent ? 'bg-marti-50' : 'hover:bg-cream-100',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                              isCurrent ? 'bg-marti-600 text-white' : 'bg-cream-100 text-ink-500',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-ink-800">
                              {t(`auth.demo${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                            </span>
                            <span className="block truncate text-[11px] text-ink-500">
                              {switching === key ? t('auth.signingIn') : account.displayName}
                            </span>
                          </span>
                          {isCurrent && <Check className="h-4 w-4 shrink-0 text-marti-600" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="border-t-2 border-cream-200 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/settings')
                }}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-cream-100"
              >
                <SettingsIcon className="h-4 w-4 text-ink-400" />
                {t('dash.settings')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/settings')
                }}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-cream-100"
              >
                <UserRound className="h-4 w-4 text-ink-400" />
                {t('dash.profile')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-coral-600 transition-colors hover:bg-coral-50"
              >
                <LogOut className="h-4 w-4" />
                {t('auth.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
