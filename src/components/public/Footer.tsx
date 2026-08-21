import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Facebook, Instagram, Twitter } from '@/components/ui/BrandIcons'
import { useT } from '@/i18n'
import { SCHOOL_INFO } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'

const QUICK_LINKS = [
  { id: SECTION_IDS.about, key: 'nav.about' },
  { id: SECTION_IDS.programs, key: 'nav.programs' },
  { id: SECTION_IDS.register, key: 'nav.register' },
]

const SOCIALS = [
  { icon: Facebook, href: SCHOOL_INFO.social.facebook, label: 'Facebook' },
  { icon: Instagram, href: SCHOOL_INFO.social.instagram, label: 'Instagram' },
  { icon: Twitter, href: SCHOOL_INFO.social.twitter, label: 'X' },
]

function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (!element) {
    // The footer also renders on /login, where the sections do not exist.
    window.location.href = `/#${id}`
    return
  }
  const top = element.getBoundingClientRect().top + window.scrollY - 76
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function Footer() {
  const t = useT()
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-marti-800 text-marti-100">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-marti-600/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl"
        aria-hidden
      />

      <div className="container-marti relative py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <div className="inline-block rounded-3xl bg-white p-4">
              <Logo size="md" linkTo={null} />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-marti-200">
              {t('footer.about')}
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-marti-300">
              {t('footer.partOf')}{' '}
              <a
                href={SCHOOL_INFO.website}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-marti-400 underline-offset-4 transition-colors hover:text-white"
              >
                {SCHOOL_INFO.orgName}
              </a>
            </p>

            <div className="mt-5 flex gap-2.5">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-marti-100 transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:text-marti-700"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-white">
              {t('footer.quickLinks')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(link.id)}
                    className="text-sm font-semibold text-marti-200 transition-colors hover:text-white"
                  >
                    {t(link.key)}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-marti-200 transition-colors hover:text-white"
                >
                  {t('nav.signIn')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-white">
              {t('footer.contactTitle')}
            </h3>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden />
                <span className="text-marti-200">
                  {SCHOOL_INFO.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden />
                <a
                  href={`mailto:${SCHOOL_INFO.email}`}
                  className="text-marti-200 transition-colors hover:text-white"
                >
                  {SCHOOL_INFO.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden />
                <a
                  href={`tel:${SCHOOL_INFO.phone.replace(/[^0-9+]/g, '')}`}
                  className="text-marti-200 transition-colors hover:text-white"
                >
                  {SCHOOL_INFO.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 w-4 shrink-0 text-center text-teal-300" aria-hidden>
                  🕘
                </span>
                <span className="text-marti-200">{t('contact.hoursValue')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-marti-300 sm:flex-row">
          <p>
            © {year} {t('brand.name')}. {t('footer.rights')}
          </p>
          <p>
            {SCHOOL_INFO.orgName} · {SCHOOL_INFO.foundedYear}
          </p>
        </div>
      </div>
    </footer>
  )
}
