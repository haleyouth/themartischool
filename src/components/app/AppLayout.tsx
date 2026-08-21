import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  Settings as SettingsIcon,
  UserCog,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { NotificationBell } from '@/components/app/NotificationBell'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/models'

interface NavItem {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  roles: Role[]
  end?: boolean
}

const NAV: NavItem[] = [
  {
    to: '/app',
    labelKey: 'dash.overview',
    icon: LayoutDashboard,
    roles: ['director', 'principal', 'teacher', 'student'],
    end: true,
  },
  {
    to: '/app/registrations',
    labelKey: 'dash.registrations',
    icon: ClipboardList,
    roles: ['director', 'principal'],
  },
  {
    to: '/app/students',
    labelKey: 'dash.students',
    icon: GraduationCap,
    roles: ['director', 'principal', 'teacher'],
  },
  {
    to: '/app/classes',
    labelKey: 'dash.classes',
    icon: BookOpen,
    roles: ['director', 'principal', 'teacher'],
  },
  {
    to: '/app/attendance',
    labelKey: 'dash.attendance',
    icon: CalendarCheck,
    roles: ['director', 'principal', 'teacher', 'student'],
  },
  {
    to: '/app/reports',
    labelKey: 'dash.reports',
    icon: FileBarChart,
    roles: ['director', 'principal', 'teacher', 'student'],
  },
  {
    to: '/app/messages',
    labelKey: 'dash.messages',
    icon: MessageSquare,
    roles: ['director', 'principal', 'teacher', 'student'],
  },
  {
    to: '/app/staff',
    labelKey: 'dash.staff',
    icon: UserCog,
    roles: ['director', 'principal'],
  },
  { to: '/app/audit', labelKey: 'dash.auditLog', icon: ScrollText, roles: ['director'] },
  {
    to: '/app/settings',
    labelKey: 'dash.settings',
    icon: SettingsIcon,
    roles: ['director', 'principal', 'teacher', 'student'],
  },
]

const ROLE_LABEL: Record<Role, string> = {
  director: 'staff.roleDirector',
  principal: 'staff.rolePrincipal',
  teacher: 'staff.roleTeacher',
  student: 'staff.roleStudent',
}

const ROLE_TONE: Record<Role, 'violet' | 'marti' | 'success' | 'gold'> = {
  director: 'violet',
  principal: 'marti',
  teacher: 'success',
  student: 'gold',
}

export default function AppLayout() {
  const t = useT()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = auth.role ?? 'student'
  const items = useMemo(() => NAV.filter((item) => item.roles.includes(role)), [role])

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await auth.signOut()
    navigate('/', { replace: true })
  }

  const displayName = auth.profile?.displayName ?? auth.user?.email ?? '—'

  const sidebarContent = (
    <>
      <div className="flex h-[68px] items-center justify-between border-b border-ink-100 px-5">
        <Logo size="sm" linkTo="/app" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"
          aria-label={t('nav.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-marti-50 text-marti-700'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-marti-600"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                          isActive ? 'text-marti-600' : 'text-ink-400',
                        )}
                      />
                      {t(item.labelKey)}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={displayName} src={auth.profile?.photoURL} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{displayName}</p>
            <Badge tone={ROLE_TONE[role]} size="sm" className="mt-0.5">
              {t(ROLE_LABEL[role])}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-crimson-50 hover:text-crimson-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t('auth.signOut')}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-ink-50/60">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-white lg:flex lg:fixed lg:inset-y-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[min(17rem,85vw)] flex-col bg-white shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-3 border-b border-ink-100 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
            aria-label={t('a11y.toggleMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-ink-950">
              {t(items.find((i) => i.to === location.pathname)?.labelKey ?? 'dash.overview')}
            </p>
          </div>

          <LanguageSwitcher />
          <NotificationBell />
          <Avatar name={displayName} src={auth.profile?.photoURL} size="sm" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
