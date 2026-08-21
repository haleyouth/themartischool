import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Youtube } from '@/components/ui/BrandIcons'
import { Logo } from '@/components/Logo'
import { useT } from '@/i18n'
import { PROGRAMS, SCHOOL_INFO } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'

const QUICK_LINKS = [
  { id: SECTION_IDS.about, key: 'nav.about' },
  { id: SECTION_IDS.programs, key: 'nav.programs' },
  { id: SECTION_IDS.tuition, key: 'nav.tuition' },
  { id: SECTION_IDS.calendar, key: 'nav.calendar' },
  { id: SECTION_IDS.contact, key: 'nav.contact' },
  { id: SECTION_IDS.register, key: 'nav.register' },
]

const SOCIALS = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
]

function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (!element) {
    // Footer also renders on /login and /app, where the sections do not exist.
    window.location.href = `/#${id}`
    return
  }
  const top = element.getBoundingClientRect().top + window.scrollY - 72
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function Footer() {
  const t = useT()
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-ink-950 text-ink-300">
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-marti-600/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-marti-700/20 blur-3xl"
        aria-hidden
      />

      <div className="container-marti relative py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-6">
            <div className="inline-block rounded-xl bg-white/95 p-3">
              <Logo size="md" linkTo={null} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              {t('footer.about')}
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-ink-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-marti-600 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {t('footer.quickLinks')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(link.id)}
                    className="group inline-flex text-sm text-ink-400 transition-colors hover:text-white"
                  >
                    <span className="border-b border-transparent transition-colors group-hover:border-marti-400">
                      {t(link.key)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {t('footer.programsLinks')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PROGRAMS.slice(0, 5).map((program) => (
                <li key={program.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.programs)}
                    className="group inline-flex text-left text-sm text-ink-400 transition-colors hover:text-white"
                  >
                    <span className="border-b border-transparent transition-colors group-hover:border-marti-400">
                      {t(program.nameKey)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {t('footer.contactTitle')}
            </h3>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-marti-400" aria-hidden />
                <span className="text-ink-400">
                  {SCHOOL_INFO.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-marti-400" aria-hidden />
                <a
                  href={`mailto:${SCHOOL_INFO.email}`}
                  className="text-ink-400 transition-colors hover:text-white"
                >
                  {SCHOOL_INFO.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-marti-400" aria-hidden />
                <a
                  href={`tel:${SCHOOL_INFO.phone.replace(/[^0-9+]/g, '')}`}
                  className="text-ink-400 transition-colors hover:text-white"
                >
                  {SCHOOL_INFO.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-ink-500">
            © {year} {t('brand.name')}. {t('footer.rights')}
          </p>
          <div className="flex gap-5 text-xs text-ink-500">
            <Link to="/login" className="transition-colors hover:text-ink-300">
              {t('nav.signIn')}
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection(SECTION_IDS.contact)}
              className="transition-colors hover:text-ink-300"
            >
              {t('nav.contact')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
