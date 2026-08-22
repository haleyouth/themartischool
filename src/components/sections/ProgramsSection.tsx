import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Users } from 'lucide-react'
import { Reveal } from '@/components/motion'
import { Section, SectionHeading, WaveDivider } from '@/components/public/Sections'
import { CardSkeleton, EmptyState } from '@/components/ui/Feedback'
import { useI18n } from '@/i18n'
import {
  minimumAgeForGrades,
  gradeLabelKey,
  isEarlyYear,
  presentationFor,
  subjectKey,
} from '@/lib/curriculum'
import { usePublicClasses } from '@/lib/usePublicClasses'
import { cn, formatTime } from '@/lib/utils'
import { SECTION_IDS } from '@/lib/useScrollSpy'

const ACCENTS = {
  marti: { chip: 'bg-marti-100 text-marti-700', ring: 'hover:border-marti-300', bar: 'bg-marti-400' },
  amber: { chip: 'bg-amber-100 text-amber-700', ring: 'hover:border-amber-300', bar: 'bg-amber-400' },
  teal: { chip: 'bg-teal-100 text-teal-700', ring: 'hover:border-teal-300', bar: 'bg-teal-400' },
  magenta: {
    chip: 'bg-magenta-100 text-magenta-700',
    ring: 'hover:border-magenta-300',
    bar: 'bg-magenta-400',
  },
  grape: { chip: 'bg-grape-100 text-grape-700', ring: 'hover:border-grape-300', bar: 'bg-grape-400' },
}

type Filter = 'all' | 'PK' | 'K' | 'graded'

/**
 * The public prospectus, built from the classes the school is actually
 * running rather than an illustrative list that could drift out of date.
 *
 * Each class is enriched for a parent: the internal name is written for
 * staff, so the card leads with the subject, a typical age range, and how
 * many places are left.
 */
export function ProgramsSection() {
  const { t, intlLocale } = useI18n()
  const { classes, loading } = usePublicClasses()
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => {
    if (filter === 'all') return classes
    return classes.filter((cls) => {
      const grades = cls.gradeLevels ?? []
      // Pre-K and K are distinct years with their own classes, so each gets
      // its own filter rather than being grouped as "early years".
      if (filter === 'graded') return grades.some((g) => !isEarlyYear(g))
      return grades.includes(filter)
    })
  }, [classes, filter])

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'PK', label: t('grades.gPK') },
    { value: 'K', label: t('grades.gK') },
    { value: 'graded', label: t('grades.gradedYears') },
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

          {classes.length > 0 && (
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
                      active
                        ? 'text-white'
                        : 'bg-white text-ink-600 ring-2 ring-ink-200 hover:text-marti-700',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="program-filter"
                        className="absolute inset-0 rounded-full bg-marti-600 shadow-pop"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </button>
                )
              })}
            </Reveal>
          )}

          {loading ? (
            <div className="mt-10">
              <CardSkeleton count={6} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="mt-10"
              title={t('programs.noneTitle')}
              description={t('programs.noneBody')}
            />
          ) : (
            <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((cls) => {
                const look = presentationFor(cls.subject)
                const accent = ACCENTS[look.accent]
                const minimumAge = minimumAgeForGrades(cls.gradeLevels ?? [])
                const grades = (cls.gradeLevels ?? []).map((g) => t(gradeLabelKey(g)))
                const full = cls.spacesLeft <= 0

                return (
                  <motion.article
                    key={cls.id}
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
                          {look.emoji}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide',
                            accent.chip,
                          )}
                        >
                          {t(`classes.subject${subjectKey(cls.subject)}`)}
                        </span>
                      </div>

                      <h3 className="mt-5 font-display text-xl font-extrabold text-ink">
                        {cls.name}
                      </h3>

                      {minimumAge !== null && (
                        <p className="mt-1 text-sm font-bold text-marti-600">
                          {t('programs.agesFrom', { from: String(minimumAge) })}
                        </p>
                      )}

                      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-600">
                        {/* A class need not carry a description, so fall back
                            to naming the years it serves. */}
                        {cls.description?.trim() ||
                          (grades.length
                            ? t('programs.forGrades', { grades: grades.join(', ') })
                            : '')}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed border-ink-100 pt-4 text-xs font-bold text-ink-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-ink-400" aria-hidden />
                          {formatTime(cls.startTime, intlLocale)} to{' '}
                          {formatTime(cls.endTime, intlLocale)}
                        </span>
                        {cls.room && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-ink-400" aria-hidden />
                            {cls.room}
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            full && 'text-magenta-600',
                          )}
                        >
                          <Users className="h-4 w-4 text-ink-400" aria-hidden />
                          {full
                            ? t('classes.full')
                            : t('programs.spacesLeft', { count: String(cls.spacesLeft) })}
                        </span>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>
          )}
        </div>
      </Section>

      <WaveDivider from="fill-cream-200" />
    </>
  )
}
