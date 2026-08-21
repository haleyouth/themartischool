import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { SECTION_IDS, useScrollSpy } from '@/lib/useScrollSpy'

const LINKS = [
  { id: SECTION_IDS.home, key: 'nav.home' },
  { id: SECTION_IDS.about, key: 'nav.about' },
  { id: SECTION_IDS.programs, key: 'nav.programs' },
  { id: SECTION_IDS.tuition, key: 'nav.tuition' },
  { id: SECTION_IDS.calendar, key: 'nav.calendar' },
  { id: SECTION_IDS.contact, key: 'nav.contact' },
]

/** Height of the fixed header, so anchor scrolling lands below it. */
const HEADER_OFFSET = 72

export function Navbar() {
  const t = useT()
  const auth = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const activeId = useScrollSpy(
    LINKS.map((link) => link.id),
    HEADER_OFFSET + 40,
  )

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  /**
   * Smooth-scroll to a section and keep the URL hash in sync, without letting
   * the browser's default jump fight the animation.
   */
  const goToSection = useCallback((id: string) => {
    setMenuOpen(false)
    const element = document.getElementById(id)
    if (!element) return

    const top = element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' })
    window.history.replaceState(null, '', id === SECTION_IDS.home ? '/' : `#${id}`)
  }, [])

  const signedIn = auth.status === 'authenticated'

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-ink-100 bg-white/85 shadow-soft backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav className="container-marti flex h-[72px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goToSection(SECTION_IDS.home)}
            aria-label={t('brand.name')}
            className="shrink-0"
          >
            <Logo size="md" linkTo={null} />
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const isActive = activeId === link.id
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => goToSection(link.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-marti-700' : 'text-ink-600 hover:text-marti-700',
                  )}
                >
                  {t(link.key)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-marti-600"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            {signedIn ? (
              <Button to="/app" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                {t('nav.dashboard')}
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-marti-700"
                >
                  {t('nav.signIn')}
                </Link>
                <Button
                  size="sm"
                  onClick={() => goToSection(SECTION_IDS.register)}
                  rightIcon={
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  }
                >
                  {t('nav.register')}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={t('a11y.toggleMenu')}
              aria-expanded={menuOpen}
              className="rounded-xl p-2 text-ink-700 transition-colors hover:bg-ink-100"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-2xl"
            >
              <div className="flex h-[72px] items-center justify-between border-b border-ink-100 px-5">
                <Logo size="sm" linkTo={null} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('nav.close')}
                  className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                  }}
                  className="space-y-1"
                >
                  {LINKS.map((link) => (
                    <motion.li
                      key={link.id}
                      variants={{
                        hidden: { opacity: 0, x: 20 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => goToSection(link.id)}
                        className={cn(
                          'block w-full rounded-xl px-4 py-3 text-left text-[15px] font-medium transition-colors',
                          activeId === link.id
                            ? 'bg-marti-50 text-marti-700'
                            : 'text-ink-700 hover:bg-ink-50',
                        )}
                      >
                        {t(link.key)}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>

              <div className="space-y-2.5 border-t border-ink-100 p-5">
                {signedIn ? (
                  <Button to="/app" fullWidth leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                    {t('nav.dashboard')}
                  </Button>
                ) : (
                  <>
                    <Button
                      fullWidth
                      onClick={() => goToSection(SECTION_IDS.register)}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      {t('nav.register')}
                    </Button>
                    <Button to="/login" variant="outline" fullWidth>
                      {t('nav.signIn')}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
