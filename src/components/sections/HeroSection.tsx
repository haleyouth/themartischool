import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { useCallback } from 'react'
import {
  CountUp,
  Reveal,
  StaggerGroup,
  StaggerItem,
  WordReveal,
  scaleIn,
} from '@/components/motion'
import { Section, SectionEyebrow, SectionHeading, WaveDivider } from '@/components/public/Sections'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { HOW_STEPS, SCHOOL_STATS, WHY_FEATURES } from '@/lib/content'
import { currentSchoolYear, formatSchoolYear } from '@/lib/schoolYear'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { cn } from '@/lib/utils'

const ACCENT_BG = {
  marti: 'bg-marti-100 text-marti-700',
  sunshine: 'bg-amber-100 text-amber-700',
  mint: 'bg-teal-100 text-teal-700',
  coral: 'bg-magenta-100 text-magenta-700',
  grape: 'bg-grape-100 text-grape-700',
}

function scrollTo(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  const top = element.getBoundingClientRect().top + window.scrollY - 76
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function HeroSection() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const yearLabel = formatSchoolYear(currentSchoolYear())

  const goRegister = useCallback(() => scrollTo(SECTION_IDS.register), [])
  const goPrograms = useCallback(() => scrollTo(SECTION_IDS.programs), [])

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        id={SECTION_IDS.home}
        className="relative overflow-hidden bg-cream pb-16 pt-28 sm:pt-36 lg:min-h-[42rem]"
      >
        {/*
          The artwork occupies the right side at full strength, with nothing
          laid over it. It is confined to the right half rather than spanning
          the section, so the headline keeps a clean cream background and
          needs no scrim to stay readable.
        */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-[52%] lg:block"
        >
          {/*
            `cover` rather than `contain`: with contain the artwork sat inside
            the box with empty margins, so the mask faded those margins and
            left the picture's own edges showing as hard lines. Filling the
            box puts the image edges exactly where the fade happens.

            The fades are deliberately short, roughly a tenth of each side, so
            the picture stays crisp and only the last sliver softens.
          */}
          <div
            className="absolute inset-0 bg-[url('/hero.webp')] bg-cover bg-center bg-no-repeat"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, black 12%), linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 12%), linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)',
              WebkitMaskComposite: 'source-in',
            }}
          />
        </div>

        {/*
          Below lg the picture sits behind the text rather than beside it, so
          it keeps a cream scrim for readability and fades at top and bottom
          so neither edge lands on a line.
        */}
        <div aria-hidden className="absolute inset-0 lg:hidden">
          <div
            className="absolute inset-0 bg-[url('/hero-900.webp')] bg-cover bg-center bg-no-repeat"
            style={{
              // Short fades here too, so only the last sliver of each edge
              // softens rather than washing out most of the picture.
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream/85 via-cream/80 to-cream" />
        </div>

        {/* Drifting blob gives the page a soft, hand-made feel. */}
        <motion.div
          aria-hidden
          animate={reduced ? undefined : { y: [0, 20, 0], scale: [1, 1.07, 1] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
          className="pointer-events-none absolute -left-32 top-48 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl"
        />

        <div className="container-marti relative">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SectionEyebrow emoji="🎒">
                  {t('home.heroBadge', { year: yearLabel })}
                </SectionEyebrow>
              </motion.div>

              <h1 className="mt-6 text-balance font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                <WordReveal text={t('home.heroTitle')} delay={0.12} />{' '}
                <span className="relative inline-block">
                  <WordReveal
                    text={t('home.heroTitleAccent')}
                    delay={0.3}
                    wordClassName="text-gradient"
                  />
                  <motion.svg
                    aria-hidden
                    viewBox="0 0 320 14"
                    preserveAspectRatio="none"
                    className="absolute -bottom-2 left-0 h-3 w-full text-amber-400"
                  >
                    <motion.path
                      d="M3,9 Q80,2 160,8 T317,5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.85, delay: 0.95, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink-600"
              >
                {t('home.heroSubtitle')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.85 }}
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
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm font-semibold text-ink-500"
              >
                {[t('home.why1Title'), t('home.why2Title'), t('home.why5Title')].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-200 text-teal-700">
                      <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
                    </span>
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>
            {/* Reserves the right half for the artwork behind it. */}
            <div className="hidden min-h-[28rem] lg:block" aria-hidden />
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="bg-cream py-10">
        <div className="container-marti">
          <StaggerGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {SCHOOL_STATS.map((stat) => (
              <StaggerItem key={stat.labelKey} variants={scaleIn}>
                <div className="rounded-4xl bg-white p-5 text-center shadow-soft ring-2 ring-ink-200 transition-transform duration-300 hover:-translate-y-1">
                  <span className="text-3xl" aria-hidden>
                    {stat.emoji}
                  </span>
                  <p className="mt-2 font-display text-3xl font-extrabold text-marti-600 sm:text-4xl">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink-500">{t(stat.labelKey)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Why families choose us ────────────────────────────── */}
      <Section id={SECTION_IDS.about} tone="cream" className="scroll-mt-20">
        <div className="container-marti">
          <SectionHeading
            eyebrow={t('brand.short')}
            eyebrowEmoji="💙"
            title={t('home.whyTitle')}
            subtitle={t('home.whySubtitle')}
          />

          <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_FEATURES.map((feature) => (
              <StaggerItem key={feature.titleKey}>
                <div className="group h-full rounded-4xl border-2 border-transparent bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-marti-200 hover:shadow-card">
                  <span
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-3xl text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6',
                      ACCENT_BG[feature.accent],
                    )}
                    aria-hidden
                  >
                    {feature.emoji}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-extrabold text-ink">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                    {t(feature.bodyKey)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>

          {/* How joining works */}
          <div className="mt-20">
            <SectionHeading
              eyebrow={t('nav.register')}
              eyebrowEmoji="✨"
              title={t('home.howTitle')}
              subtitle={t('home.howSubtitle')}
            />

            <StaggerGroup className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div
                className="absolute left-0 right-0 top-8 hidden h-1 rounded-full bg-gradient-to-r from-transparent via-marti-200 to-transparent lg:block"
                aria-hidden
              />
              {HOW_STEPS.map((step, index) => (
                <StaggerItem key={step.titleKey} className="relative text-center">
                  <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-ink bg-cream text-3xl shadow-soft transition-transform duration-300 hover:scale-110">
                    <span aria-hidden>{step.emoji}</span>
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-marti-600 font-display text-xs font-extrabold text-white ring-4 ring-cream-100">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-base font-extrabold text-ink">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{t(step.bodyKey)}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <Reveal delay={0.2} className="mt-12 text-center">
              <Button
                size="lg"
                onClick={goRegister}
                rightIcon={
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                }
              >
                {t('home.ctaButton')}
              </Button>
            </Reveal>
          </div>
        </div>
      </Section>

      <WaveDivider from="fill-cream" />
    </>
  )
}
