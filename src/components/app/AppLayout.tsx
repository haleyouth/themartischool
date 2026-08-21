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
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings as SettingsIcon,
  UserCog,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { AccountMenu } from '@/components/app/AccountMenu'
import { LiveClock } from '@/components/app/LiveClock'
import { NotificationBell } from '@/components/app/NotificationBell'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Avatar } from '@/components/ui/Avatar'
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
  group: 'main' | 'school' | 'admin'
}

const NAV: NavItem[] = [
  {
    to: '/app',
    labelKey: 'dash.overview',
    icon: LayoutDashboard,
    roles: ['director', 'principal', 'teacher', 'student'],
    end: true,
    group: 'main',
  },
  {
    to: '/app/messages',
    labelKey: 'dash.messages',
    icon: MessageSquare,
    roles: ['director', 'principal', 'teacher', 'student'],
    group: 'main',
  },
  {
    to: '/app/registrations',
    labelKey: 'dash.registrations',
    icon: ClipboardList,
    roles: ['director', 'principal'],
    group: 'school',
  },
  {
    to: '/app/students',
    labelKey: 'dash.students',
    icon: GraduationCap,
    roles: ['director', 'principal', 'teacher'],
    group: 'school',
  },
  {
    to: '/app/classes',
    labelKey: 'dash.classes',
    icon: BookOpen,
    roles: ['director', 'principal', 'teacher'],
    group: 'school',
  },
  {
    to: '/app/attendance',
    labelKey: 'dash.attendance',
    icon: CalendarCheck,
    roles: ['director', 'principal', 'teacher', 'student'],
    group: 'school',
  },
  {
    to: '/app/reports',
    labelKey: 'dash.reports',
    icon: FileBarChart,
    roles: ['director', 'principal', 'teacher', 'student'],
    group: 'school',
  },
  {
    to: '/app/staff',
    labelKey: 'dash.staff',
    icon: UserCog,
    roles: ['director', 'principal'],
    group: 'admin',
  },
  {
    to: '/app/audit',
    labelKey: 'dash.auditLog',
    icon: ScrollText,
    roles: ['principal'],
    group: 'admin',
  },
  {
    to: '/app/settings',
    labelKey: 'dash.settings',
    icon: SettingsIcon,
    roles: ['director', 'principal', 'teacher', 'student'],
    group: 'admin',
  },
]

const COLLAPSE_KEY = 'marti.sidebarCollapsed'

export default function AppLayout() {
  const t = useT()
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Remember the collapsed choice, since it is a workspace preference rather
  // than something to re-decide on every page load.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const role = auth.role ?? 'student'
  const items = useMemo(() => NAV.filter((item) => item.roles.includes(role)), [role])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      // A browser blocking storage must not break the layout.
    }
  }, [collapsed])

  async function handleSignOut() {
    await auth.signOut()
    navigate('/', { replace: true })
  }

  const groups: NavItem['group'][] = ['main', 'school', 'admin']
  const currentTitle =
    items.find((item) =>
      item.end ? item.to === location.pathname : location.pathname.startsWith(item.to),
    )?.labelKey ?? 'dash.overview'

  const displayName = auth.profile?.displayName ?? auth.user?.email ?? ''

  /** `mini` collapses to icons only; the mobile drawer always shows labels. */
  function renderSidebar(mini: boolean) {
    return (
      <>
        {/*
          The logo is centred and given room to breathe. The close and expand
          controls sit absolutely so they do not pull it off centre.
        */}
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center',
            mini ? 'h-[76px] px-2' : 'h-[104px] px-5',
          )}
        >
          {!mini && <Logo size="lg" linkTo="/app" />}

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-ink-400 hover:bg-cream-200 lg:hidden"
            aria-label={t('nav.close')}
          >
            <X className="h-5 w-5" />
          </button>

          {mini && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="hidden rounded-xl p-2 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink lg:block"
              aria-label={t('dash.expandSidebar')}
              title={t('dash.expandSidebar')}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className={cn('scrollbar-thin flex-1 overflow-y-auto pb-4', mini ? 'px-2' : 'px-3')}>
          {groups.map((group) => {
            const groupItems = items.filter((item) => item.group === group)
            if (!groupItems.length) return null

            return (
              <div key={group} className="mb-5">
                {group !== 'main' && !mini && (
                  <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-400">
                    {group === 'school' ? t('brand.short') : t('settings.title')}
                  </p>
                )}
                {group !== 'main' && mini && <div className="mx-2 mb-3 h-0.5 bg-ink-200" />}
                <ul className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          title={mini ? t(item.labelKey) : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex items-center rounded-2xl text-sm font-bold transition-all duration-200',
                              mini ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5',
                              isActive
                                ? 'text-white'
                                : 'text-ink-600 hover:bg-cream-200 hover:text-ink',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId={mini ? 'sidebar-active-mini' : 'sidebar-active'}
                                  className="absolute inset-0 rounded-2xl bg-marti-600"
                                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                />
                              )}
                              <Icon
                                className={cn(
                                  'relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                                  isActive ? 'text-white' : 'text-ink-400',
                                )}
                              />
                              {!mini && <span className="relative">{t(item.labelKey)}</span>}
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Who is signed in, and a sign out that is always reachable. */}
        <div className={cn('shrink-0 border-t-2 border-ink-200', mini ? 'p-2' : 'p-3')}>
          {!mini && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl px-2 py-2">
              <Avatar name={displayName} src={auth.profile?.photoURL} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{displayName}</p>
                <p className="truncate text-xs text-ink-500">
                  {t(`staff.role${role.charAt(0).toUpperCase()}${role.slice(1)}`)}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            title={mini ? t('auth.signOut') : undefined}
            className={cn(
              'flex w-full items-center rounded-2xl text-sm font-bold text-magenta-600 transition-colors hover:bg-magenta-50',
              mini ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5',
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!mini && t('auth.signOut')}
          </button>

          {!mini && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="mt-1 hidden w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink lg:flex"
            >
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              {t('dash.collapseSidebar')}
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-cream-200">
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="fixed inset-y-0 z-40 hidden shrink-0 flex-col border-r-2 border-ink-200 bg-cream lg:flex"
      >
        {renderSidebar(collapsed)}
      </motion.aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[min(17rem,85vw)] flex-col bg-cream shadow-2xl"
            >
              {renderSidebar(false)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-300',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-64',
        )}
      >
        <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center gap-3 border-b-2 border-ink-200 bg-cream/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-ink-600 transition-colors hover:bg-cream-200 lg:hidden"
            aria-label={t('a11y.toggleMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-extrabold text-ink">
              {t(currentTitle)}
            </h1>
          </div>

          {/*
            The clock is information, the rest are controls, so a divider and
            wider gap separate the two groups instead of one flat run of items.
          */}
          <div className="hidden items-center gap-5 xl:flex">
            <LiveClock />
            <span className="h-8 w-px bg-ink-200" aria-hidden />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <NotificationBell />
            <AccountMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
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
