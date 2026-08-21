import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Drama,
  FileText,
  GraduationCap,
  Layers,
  PartyPopper,
  Quote,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useCallback } from 'react'
import {
  CountUp,
  Reveal,
  StaggerGroup,
  StaggerItem,
  TiltCard,
  WordReveal,
  fadeUp,
  scaleIn,
} from '@/components/motion'
import { Section, SectionEyebrow, SectionHeading } from '@/components/public/Sections'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { HOW_STEPS, PROGRAMS, SCHOOL_STATS, TESTIMONIALS, WHY_FEATURES } from '@/lib/content'
import { currentSchoolYear, formatSchoolYear } from '@/lib/schoolYear'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { cn } from '@/lib/utils'

const ICONS = {
  GraduationCap,
  Layers,
  Drama,
  TrendingUp,
  CalendarDays,
  Users,
  FileText,
  Search,
  BadgeCheck,
  PartyPopper,
} as const

const PROGRAM_ACCENTS = {
  marti: 'bg-marti-50 text-marti-600',
  gold: 'bg-gold-50 text-gold-600',
  crimson: 'bg-crimson-50 text-crimson-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
}

function scrollTo(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  const top = element.getBoundingClientRect().top + window.scrollY - 72
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function HeroSection() {
  const { t, locale } = useI18n()
  const reduced = useReducedMotion()
  const year = currentSchoolYear()
  const yearLabel = formatSchoolYear(year)

  const goRegister = useCallback(() => scrollTo(SECTION_IDS.register), [])
  const goPrograms = useCallback(() => scrollTo(SECTION_IDS.programs), [])
  const goTuition = useCallback(() => scrollTo(SECTION_IDS.tuition), [])

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        id={SECTION_IDS.home}
        className="relative overflow-hidden bg-gradient-to-b from-marti-50 via-white to-white pb-20 pt-32 sm:pt-40"
      >
        <div className="bg-dots absolute inset-0 opacity-50" aria-hidden />

        {/* Ambient blobs keep the hero alive without demanding attention. */}
        <motion.div
          aria-hidden
          animate={reduced ? undefined : { y: [0, -24, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -right-32 top-10 h-[26rem] w-[26rem] rounded-full bg-marti-200/45 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={reduced ? undefined : { y: [0, 20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="pointer-events-none absolute -left-40 top-52 h-96 w-96 rounded-full bg-gold-200/35 blur-3xl"
        />

        <div className="container-marti relative">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SectionEyebrow>{t('home.heroBadge', { year: yearLabel })}</SectionEyebrow>
              </motion.div>

              <h1 className="mt-6 text-balance font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl">
                <WordReveal text={t('home.heroTitle')} delay={0.15} />{' '}
                <span className="relative inline-block">
                  <WordReveal
                    text={t('home.heroTitleAccent')}
                    delay={0.35}
                    wordClassName="text-gradient"
                  />
                  <motion.svg
                    aria-hidden
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                    className="absolute -bottom-1.5 left-0 h-2.5 w-full text-gold-400"
                  >
                    <motion.path
                      d="M2,8 Q75,2 150,7 T298,5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.9, delay: 0.95, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.75 }}
                className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink-600"
              >
                {t('home.heroSubtitle')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Button
                  size="xl"
                  onClick={goRegister}
                  rightIcon={
                    <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  }
                >
                  {t('home.heroCtaPrimary')}
                </Button>
                <Button size="xl" variant="outline" onClick={goPrograms}>
                  {t('home.heroCtaSecondary')}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.05 }}
                className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-ink-500"
              >
                {[t('home.why1Title'), t('home.why2Title'), t('home.why5Title')].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Hero visual — a glimpse of the product itself. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
            >
              <TiltCard max={7}>
                <div className="relative rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-20px_rgb(27_121_192/0.35)] backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marti-600 text-white">
                        <CalendarDays className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {locale === 'tr' ? 'Cumartesi' : 'Saturday'}
                        </p>
                        <p className="text-xs text-ink-500">09:30 – 13:00</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {locale === 'tr' ? 'Aktif' : 'Live'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {PROGRAMS.slice(0, 3).map((program, index) => (
                      <motion.div
                        key={program.id}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 + index * 0.12 }}
                        className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5"
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold',
                            PROGRAM_ACCENTS[program.accent],
                          )}
                        >
                          {t(program.nameKey).charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {t(program.nameKey)}
                          </p>
                          <p className="text-xs text-ink-500">{t(program.ageKey)}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-ink-400">
                          {program.capacity}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-marti-600 p-4 text-white">
                    <div>
                      <p className="text-xs text-marti-100">{t('dash.attendanceRate')}</p>
                      <p className="font-display text-2xl font-bold">
                        <CountUp value={96} suffix="%" />
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-marti-200" aria-hidden />
                  </div>
                </div>
              </TiltCard>

              <motion.div
                aria-hidden
                animate={reduced ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card sm:flex"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">
                    <CountUp value={180} suffix="+" />
                  </p>
                  <p className="text-[11px] text-ink-500">{t('home.statStudents')}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────── */}
      <section className="border-y border-ink-100 bg-white">
        <div className="container-marti">
          <StaggerGroup className="grid grid-cols-2 divide-x divide-ink-100 lg:grid-cols-4">
            {SCHOOL_STATS.map((stat) => (
              <StaggerItem
                key={stat.labelKey}
                variants={scaleIn}
                className="px-4 py-8 text-center sm:py-10"
              >
                <p className="font-display text-4xl font-extrabold text-marti-600 sm:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 text-sm font-medium text-ink-500">{t(stat.labelKey)}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── How enrollment works ──────────────────────────────── */}
      <Section tone="tint">
        <div className="container-marti">
          <SectionHeading
            eyebrow={t('nav.register')}
            title={t('home.howTitle')}
            subtitle={t('home.howSubtitle')}
          />

          <StaggerGroup className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-marti-200 to-transparent lg:block"
              aria-hidden
            />
            {HOW_STEPS.map((stepItem, index) => {
              const Icon = ICONS[stepItem.icon as keyof typeof ICONS]
              return (
                <StaggerItem key={stepItem.titleKey} className="relative text-center">
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-marti-100 bg-white shadow-soft transition-transform duration-300 hover:scale-110">
                    <Icon className="h-6 w-6 text-marti-600" aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-marti-600 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-ink-900">
                    {t(stepItem.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{t(stepItem.bodyKey)}</p>
                </StaggerItem>
              )
            })}
          </StaggerGroup>
        </div>
      </Section>

      {/* ── Why MARTI ─────────────────────────────────────────── */}
      <Section>
        <div className="container-marti">
          <SectionHeading
            eyebrow={t('brand.short')}
            title={t('home.whyTitle')}
            subtitle={t('home.whySubtitle')}
          />

          <StaggerGroup className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_FEATURES.map((feature) => {
              const Icon = ICONS[feature.icon as keyof typeof ICONS]
              return (
                <StaggerItem key={feature.titleKey} className="group flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marti-50 text-marti-600 shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-marti-600 group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-900">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                      {t(feature.bodyKey)}
                    </p>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerGroup>
        </div>
      </Section>

      {/* ── Testimonials ──────────────────────────────────────── */}
      <Section tone="tint">
        <div className="container-marti">
          <SectionHeading
            eyebrow={t('home.testimonialsTitle')}
            title={t('home.testimonialsTitle')}
            subtitle={t('home.testimonialsSubtitle')}
          />

          <StaggerGroup className="mt-14 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <StaggerItem key={item.id}>
                <figure className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                  <div className="flex gap-0.5 text-gold-400" aria-label="5 / 5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" aria-hidden />
                    ))}
                  </div>
                  <Quote className="mt-4 h-6 w-6 text-marti-200" aria-hidden />
                  <blockquote className="mt-2 flex-1 text-pretty text-[15px] leading-relaxed text-ink-700">
                    {locale === 'tr' ? item.quoteTr : item.quoteEn}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-ink-100 pt-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marti-100 font-semibold text-marti-700">
                      {item.nameEn.charAt(0)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink-900">
                        {item.nameEn}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {locale === 'tr' ? item.roleTr : item.roleEn}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </Section>

      {/* ── Mid-page CTA ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950 py-20 sm:py-24">
        <div className="bg-dots absolute inset-0 opacity-20" aria-hidden />
        <motion.div
          aria-hidden
          animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.3, 0.45, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-marti-600/30 blur-3xl"
        />

        <div className="container-marti relative text-center">
          <Reveal variants={fadeUp}>
            <SectionEyebrow tone="dark">{t('nav.register')}</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-balance font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              {t('home.ctaTitle')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-ink-300">
              {t('home.ctaBody', { year: yearLabel })}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="xl"
                variant="white"
                onClick={goRegister}
                rightIcon={
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                }
              >
                {t('home.ctaButton')}
              </Button>
              <Button
                size="xl"
                onClick={goTuition}
                className="border border-white/25 bg-white/5 text-white hover:bg-white/15"
              >
                {t('home.ctaSecondary')}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
