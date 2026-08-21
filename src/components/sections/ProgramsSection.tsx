import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { Reveal } from '@/components/motion'
import { Section, SectionHeading, WaveDivider } from '@/components/public/Sections'
import { useI18n } from '@/i18n'
import { PROGRAMS } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { cn } from '@/lib/utils'

const ACCENTS = {
  marti: { chip: 'bg-marti-100 text-marti-700', ring: 'hover:border-marti-300', bar: 'bg-marti-400' },
  sunshine: {
    chip: 'bg-sunshine-100 text-sunshine-700',
    ring: 'hover:border-sunshine-300',
    bar: 'bg-sunshine-400',
  },
  mint: { chip: 'bg-mint-100 text-mint-700', ring: 'hover:border-mint-300', bar: 'bg-mint-400' },
  coral: { chip: 'bg-coral-100 text-coral-700', ring: 'hover:border-coral-300', bar: 'bg-coral-400' },
  grape: { chip: 'bg-grape-100 text-grape-700', ring: 'hover:border-grape-300', bar: 'bg-grape-400' },
}

type Filter = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'heritage'

export function ProgramsSection() {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')

  const visible =
    filter === 'all' ? PROGRAMS : PROGRAMS.filter((p) => p.level === filter || p.level === 'all')

  const levelLabels: Record<string, string> = {
    beginner: t('programs.levelBeginner'),
    intermediate: t('programs.levelIntermediate'),
    advanced: t('programs.levelAdvanced'),
    heritage: t('programs.levelHeritage'),
    all: t('programs.levelAll'),
  }

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'beginner', label: t('programs.levelBeginner') },
    { value: 'intermediate', label: t('programs.levelIntermediate') },
    { value: 'advanced', label: t('programs.levelAdvanced') },
    { value: 'heritage', label: t('programs.levelHeritage') },
  ]

  return (
    <>
      <Section id={SECTION_IDS.programs} tone="white" className="scroll-mt-20">
        <div className="container-marti">
          <SectionHeading
            eyebrow={t('nav.programs')}
            eyebrowEmoji="📚"
            title={t('programs.title')}
            subtitle={t('programs.subtitle')}
          />

          {/* Rounded filter pills, with the active pill sliding between options. */}
          <Reveal className="mb-10 mt-10 flex flex-wrap justify-center gap-2">
            {filters.map((item) => {
              const active = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-full px-5 py-2.5 text-sm font-bold transition-colors duration-200',
                    active ? 'text-white' : 'bg-white text-ink-600 ring-2 ring-cream-200 hover:text-marti-700',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="program-filter"
                      className="absolute inset-0 rounded-full bg-marti-600 shadow-pop-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </button>
              )
            })}
          </Reveal>

          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((program) => {
              const accent = ACCENTS[program.accent]
              return (
                <motion.article
                  key={program.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'group flex flex-col overflow-hidden rounded-4xl border-2 border-transparent bg-white shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-card',
                    accent.ring,
                  )}
                >
                  <div className={cn('h-2 w-full', accent.bar)} aria-hidden />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'flex h-16 w-16 items-center justify-center rounded-3xl text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
                          accent.chip,
                        )}
                        aria-hidden
                      >
                        {program.emoji}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide',
                          accent.chip,
                        )}
                      >
                        {levelLabels[program.level]}
                      </span>
                    </div>

                    <h3 className="mt-5 font-display text-xl font-extrabold text-ink-950">
                      {t(program.nameKey)}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-marti-600">{t(program.ageKey)}</p>
                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-600">
                      {t(program.descKey)}
                    </p>

                    <div className="mt-5 flex items-center gap-4 border-t-2 border-dashed border-cream-200 pt-4 text-xs font-bold text-ink-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-ink-400" aria-hidden />
                        {program.duration} {t('common.hours')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-ink-400" aria-hidden />
                        {program.capacity} {t('programs.students')}
                      </span>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </Section>

      <WaveDivider from="fill-cream-100" />
    </>
  )
}
