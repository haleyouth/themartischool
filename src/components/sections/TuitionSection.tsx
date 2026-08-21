import { motion } from 'framer-motion'
import { ArrowRight, Check, Info, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion'
import { Section, SectionHeading } from '@/components/public/Sections'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { TUITION_FAQS, TUITION_PLANS } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { cn, currency } from '@/lib/utils'

/** Paying for the year up front earns a discount, applied here for display. */
const ANNUAL_MONTHS = 10
const ANNUAL_DISCOUNT = 0.9

export function TuitionSection({ onChoosePlan }: { onChoosePlan?: (planId: string) => void }) {
  const { t, intlLocale } = useI18n()
  const [annual, setAnnual] = useState(false)

  return (
    <Section id={SECTION_IDS.tuition} className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.tuition')}
          title={t('tuition.title')}
          subtitle={t('tuition.subtitle')}
        />

        {/* Monthly / annual toggle */}
        <Reveal className="mt-10 flex justify-center">
          <div className="inline-flex rounded-xl bg-ink-100 p-1">
            {[
              { value: false, label: t('tuition.perMonth').replace('/', '') },
              { value: true, label: t('tuition.perYear').replace('/', '') },
            ].map((option) => {
              const active = annual === option.value
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setAnnual(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-colors',
                    active ? 'text-marti-700' : 'text-ink-500 hover:text-ink-800',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tuition-toggle"
                      className="absolute inset-0 rounded-lg bg-white shadow-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{option.label}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* Placeholder-pricing notice — the school replaces these figures. */}
        <Reveal delay={0.1} className="mx-auto mt-6 max-w-xl">
          <p className="flex items-start justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs leading-relaxed text-amber-800">
            <Info className="mt-px h-4 w-4 shrink-0" aria-hidden />
            {t('tuition.placeholderNotice')}
          </p>
        </Reveal>

        <StaggerGroup className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {TUITION_PLANS.map((plan) => {
            const monthly = plan.price
            const shown = annual
              ? Math.round(monthly * ANNUAL_MONTHS * ANNUAL_DISCOUNT)
              : monthly

            return (
              <StaggerItem key={plan.id}>
                <div
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300',
                    plan.featured
                      ? 'border-marti-300 shadow-lift lg:-translate-y-4 lg:scale-[1.03]'
                      : 'border-ink-100 shadow-soft hover:-translate-y-1.5 hover:border-marti-200 hover:shadow-card',
                  )}
                >
                  {plan.featured && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-marti-gradient"
                        aria-hidden
                      />
                      <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-soft">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {t('tuition.mostPopular')}
                      </span>
                    </>
                  )}

                  <div className="p-7 pb-0">
                    <h3 className="font-display text-xl font-bold text-ink-950">
                      {t(plan.nameKey)}
                    </h3>
                    <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-ink-600">
                      {t(plan.descKey)}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      {/* Key on the value so the number animates when it changes. */}
                      <motion.span
                        key={shown}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="font-display text-4xl font-extrabold text-ink-950"
                      >
                        {currency(shown, intlLocale)}
                      </motion.span>
                      <span className="text-sm font-medium text-ink-500">
                        {annual ? t('tuition.perYear') : t('tuition.perMonth')}
                      </span>
                    </div>
                    {annual && (
                      <p className="mt-1.5 text-xs font-medium text-emerald-600">
                        {currency(monthly, intlLocale)}
                        {t('tuition.perMonth')} · −10%
                      </p>
                    )}
                  </div>

                  <div className="p-7 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                      {t('tuition.included')}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {plan.featureKeys.map((key) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm text-ink-700">
                          <span
                            className={cn(
                              'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full',
                              plan.featured
                                ? 'bg-marti-600 text-white'
                                : 'bg-emerald-100 text-emerald-700',
                            )}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          </span>
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto p-7 pt-0">
                    <Button
                      fullWidth
                      size="lg"
                      variant={plan.featured ? 'primary' : 'outline'}
                      onClick={() => onChoosePlan?.(plan.id)}
                      rightIcon={
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      }
                    >
                      {t('tuition.choosePlan')}
                    </Button>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>

        {/* FAQ */}
        <div className="mt-20">
          <SectionHeading eyebrow={t('tuition.faqTitle')} title={t('tuition.faqTitle')} />
          <Reveal className="mx-auto mt-10 max-w-3xl">
            <Accordion
              items={TUITION_FAQS.map((faq) => ({
                question: t(faq.qKey),
                answer: t(faq.aKey),
              }))}
            />
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
