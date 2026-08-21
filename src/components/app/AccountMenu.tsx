import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronsUpDown,
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
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import type { Role } from '@/types/models'

const ROLE_META: Record<
  Role,
  { icon: typeof ShieldCheck; tone: 'grape' | 'marti' | 'mint' | 'sunshine' }
> = {
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
 * The signed in account: who you are, and how to leave.
 *
 * Deliberately shows only the active account. An account switcher here made
 * it ambiguous which identity was acting, which matters when the actions
 * being taken are recorded against a person in the audit log.
 */
export function AccountMenu() {
  const t = useT()
  const auth = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
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
        className="flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-2.5 shadow-soft ring-2 ring-ink-200 transition-all hover:ring-marti-200"
      >
        <Avatar name={displayName} src={auth.profile?.photoURL} size="sm" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[9rem] truncate text-xs font-bold text-ink">
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
            className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border-2 border-ink-200 bg-white shadow-card"
          >
            <div className="flex items-center gap-3 bg-cream-200 p-4">
              <Avatar name={displayName} src={auth.profile?.photoURL} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink">{displayName}</p>
                <p className="truncate text-xs text-ink-500">
                  {auth.profile?.email ?? auth.profile?.studentId ?? ''}
                </p>
              </div>
              <Badge tone={ROLE_META[role].tone} size="sm">
                <RoleIcon className="h-3 w-3" />
                {t(ROLE_LABEL[role])}
              </Badge>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/settings')
                }}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-cream-200"
              >
                <UserRound className="h-4 w-4 text-ink-400" />
                {t('dash.profile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/settings')
                }}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-cream-200"
              >
                <SettingsIcon className="h-4 w-4 text-ink-400" />
                {t('dash.settings')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-bold text-magenta-600 transition-colors hover:bg-magenta-50"
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
