import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ScrollText,
  Settings as SettingsIcon,
  UserCog,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { AccountMenu } from '@/components/app/AccountMenu'
import { NotificationBell } from '@/components/app/NotificationBell'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
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
    roles: ['director'],
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

const GROUP_LABEL: Record<NavItem['group'], string | null> = {
  main: null,
  school: 'dash.classes',
  admin: 'dash.settings',
}

export default function AppLayout() {
  const t = useT()
  const auth = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = auth.role ?? 'student'
  const items = useMemo(() => NAV.filter((item) => item.roles.includes(role)), [role])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const groups: NavItem['group'][] = ['main', 'school', 'admin']
  const currentTitle =
    items.find((item) => (item.end ? item.to === location.pathname : location.pathname.startsWith(item.to)))
      ?.labelKey ?? 'dash.overview'

  const sidebarContent = (
    <>
      <div className="flex h-[76px] items-center justify-between px-5">
        <Logo size="sm" linkTo="/app" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-xl p-2 text-ink-400 hover:bg-cream-200 lg:hidden"
          aria-label={t('nav.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group)
          if (!groupItems.length) return null

          return (
            <div key={group} className="mb-5">
              {GROUP_LABEL[group] && (
                <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-400">
                  {group === 'school' ? t('brand.short') : t('settings.title')}
                </p>
              )}
              <ul className="space-y-1">
                {groupItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200',
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
                                layoutId="sidebar-active"
                                className="absolute inset-0 rounded-2xl bg-marti-600 shadow-pop"
                                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                              />
                            )}
                            <Icon
                              className={cn(
                                'relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                                isActive ? 'text-white' : 'text-ink-400',
                              )}
                            />
                            <span className="relative">{t(item.labelKey)}</span>
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
    </>
  )

  return (
    <div className="flex min-h-screen bg-cream-200">
      <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-ink-200 bg-cream lg:flex lg:fixed lg:inset-y-0">
        {sidebarContent}
      </aside>

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
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
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

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <NotificationBell />
          <AccountMenu />
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
