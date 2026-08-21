import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Drama,
  History,
  Home as HomeIcon,
  Landmark,
  MessagesSquare,
  Music,
  PenTool,
  Sprout,
  Users,
} from 'lucide-react'
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion'
import { Section, SectionHeading } from '@/components/public/Sections'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { useT } from '@/i18n'
import { PROGRAMS, SATURDAY_SCHEDULE } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { cn } from '@/lib/utils'

const ICONS = { Sprout, BookOpen, PenTool, MessagesSquare, Home: HomeIcon, Music } as const

const ACCENTS = {
  marti: 'bg-marti-50 text-marti-600 group-hover:bg-marti-600',
  gold: 'bg-gold-50 text-gold-600 group-hover:bg-gold-500',
  crimson: 'bg-crimson-50 text-crimson-600 group-hover:bg-crimson-600',
  emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
  violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600',
  amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500',
}

const SUBJECTS = [
  { icon: BookOpen, key: 'classes.subjectTurkish' },
  { icon: Landmark, key: 'classes.subjectCulture' },
  { icon: History, key: 'classes.subjectHistory' },
  { icon: Music, key: 'classes.subjectMusic' },
  { icon: Drama, key: 'classes.subjectFolkDance' },
]

type Filter = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'heritage'

export function ProgramsSection() {
  const t = useT()
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

  return (
    <Section id={SECTION_IDS.programs} tone="tint" className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.programs')}
          title={t('programs.title')}
          subtitle={t('programs.subtitle')}
        />

        <Reveal className="mb-10 mt-10 flex justify-center">
          <Tabs
            variant="pills"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: t('common.all') },
              { value: 'beginner', label: t('programs.levelBeginner') },
              { value: 'intermediate', label: t('programs.levelIntermediate') },
              { value: 'advanced', label: t('programs.levelAdvanced') },
              { value: 'heritage', label: t('programs.levelHeritage') },
            ]}
          />
        </Reveal>

        {/* layout animation lets cards glide into place when the filter changes */}
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((program) => {
            const Icon = ICONS[program.icon as keyof typeof ICONS]
            return (
              <motion.article
                key={program.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-marti-200 hover:shadow-lift"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:text-white',
                        ACCENTS[program.accent],
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <Badge tone="marti" size="sm">
                      {levelLabels[program.level]}
                    </Badge>
                  </div>

                  <h3 className="mt-5 font-display text-lg font-bold text-ink-900">
                    {t(program.nameKey)}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-marti-600">
                    {t(program.ageKey)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{t(program.descKey)}</p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-ink-100 bg-ink-50/50 px-6 py-4 text-xs text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    {program.duration} {t('programs.perWeek')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    {program.capacity} {t('programs.students')}
                  </span>
                </div>
              </motion.article>
            )
          })}
        </motion.div>

        {/* Subjects */}
        <div className="mt-20">
          <SectionHeading eyebrow={t('nav.programs')} title={t('programs.subjectTitle')} />
          <StaggerGroup className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-4">
            {SUBJECTS.map(({ icon: Icon, key }) => (
              <StaggerItem key={key}>
                <div className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-3.5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-marti-200 hover:shadow-card">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marti-50 text-marti-600 transition-colors group-hover:bg-marti-600 group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-ink-800">{t(key)}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>

        {/* A Saturday at MARTI */}
        <div className="mt-20">
          <SectionHeading
            eyebrow={t('calendar.timeTitle')}
            title={t('programs.scheduleTitle')}
            subtitle={t('programs.scheduleSubtitle')}
          />
          <StaggerGroup className="relative mx-auto mt-12 max-w-2xl">
            <div
              className="absolute bottom-4 left-[4.5rem] top-4 w-px bg-gradient-to-b from-marti-200 via-marti-300 to-marti-200"
              aria-hidden
            />
            {SATURDAY_SCHEDULE.map((slot) => (
              <StaggerItem key={slot.time} className="relative flex items-center gap-6 py-4">
                <span className="w-14 shrink-0 text-right font-display text-sm font-bold text-marti-600">
                  {slot.time}
                </span>
                <span className="relative z-10 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <span className="absolute h-3.5 w-3.5 rounded-full bg-marti-600" />
                  <span className="absolute h-3.5 w-3.5 animate-pulse-ring rounded-full bg-marti-400" />
                </span>
                <span className="flex-1 rounded-xl border border-ink-100 bg-white px-5 py-3.5 text-sm font-medium text-ink-800 shadow-soft transition-transform duration-300 hover:translate-x-1">
                  {t(slot.labelKey)}
                </span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </Section>
  )
}
