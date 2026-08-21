import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { LayoutDashboard, Lock, Menu, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { HEADER_HEIGHT, SECTION_IDS, useScrollSpy } from '@/lib/useScrollSpy'

const LINKS = [
  { id: SECTION_IDS.home, key: 'nav.home' },
  { id: SECTION_IDS.about, key: 'nav.about' },
  { id: SECTION_IDS.programs, key: 'nav.programs' },
  { id: SECTION_IDS.register, key: 'nav.register' },
]



export function Navbar() {
  const t = useT()
  const auth = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const activeId = useScrollSpy(
    LINKS.map((link) => link.id),
    HEADER_HEIGHT + 40,
  )

  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 20))

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const goToSection = useCallback((id: string) => {
    setMenuOpen(false)
    const element = document.getElementById(id)
    if (!element) return

    const top = element.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT
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
            ? 'bg-cream/90 shadow-soft backdrop-blur-xl'
            : 'bg-transparent',
        )}
      >
        {/* Taller bar so a larger wordmark has room to sit centred. */}
        <nav className="container-marti flex h-[88px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goToSection(SECTION_IDS.home)}
            aria-label={t('brand.name')}
            // flex + items-center keeps the wordmark on the bar's centre line
            // rather than sitting on the text baseline.
            className="flex shrink-0 items-center"
          >
            <Logo size="lg" linkTo={null} />
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
                    'relative rounded-full px-4 py-2 text-sm font-bold transition-colors',
                    isActive ? 'text-marti-700' : 'text-ink-600 hover:text-marti-700',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white shadow-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{t(link.key)}</span>
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
              /* Register already has its own nav link, so only sign in here. */
              <Button
                to="/login"
                size="sm"
                variant="outline"
                leftIcon={<Lock className="h-4 w-4" />}
              >
                {t('nav.signIn')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={t('a11y.toggleMenu')}
              aria-expanded={menuOpen}
              className="rounded-2xl bg-white p-2.5 text-ink-700 shadow-soft transition-colors hover:text-marti-700"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-cream shadow-2xl"
            >
              <div className="flex h-[88px] items-center justify-between px-5">
                <Logo size="sm" linkTo={null} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('nav.close')}
                  className="rounded-2xl bg-white p-2.5 text-ink-500 shadow-soft"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
                  }}
                  className="space-y-2"
                >
                  {LINKS.map((link) => (
                    <motion.li
                      key={link.id}
                      variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
                    >
                      <button
                        type="button"
                        onClick={() => goToSection(link.id)}
                        className={cn(
                          'block w-full rounded-2xl px-5 py-3.5 text-left text-base font-bold transition-colors',
                          activeId === link.id
                            ? 'bg-marti-600 text-white shadow-pop'
                            : 'bg-white text-ink-700 shadow-soft',
                        )}
                      >
                        {t(link.key)}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>

              <div className="space-y-2.5 p-5">
                {signedIn ? (
                  <Button to="/app" fullWidth leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                    {t('nav.dashboard')}
                  </Button>
                ) : (
                  <>
                    <Button
                      to="/login"
                      variant="outline"
                      fullWidth
                      leftIcon={<Lock className="h-4 w-4" />}
                    >
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
