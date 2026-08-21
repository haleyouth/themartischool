import { CalendarDays, GraduationCap, PartyPopper, Snowflake, Sun } from 'lucide-react'
import { useMemo } from 'react'
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion'
import { Section, SectionHeading } from '@/components/public/Sections'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/i18n'
import { SATURDAY_SCHEDULE } from '@/lib/content'
import { currentSchoolYear, formatSchoolYear, saturdaysBetween } from '@/lib/schoolYear'
import { SECTION_IDS } from '@/lib/useScrollSpy'
import { formatDate } from '@/lib/utils'

/**
 * Key dates for the school year. Dates are derived from the current school
 * year so the section stays correct without an annual code edit.
 */
function buildKeyDates(year: number) {
  return [
    {
      id: 'fall-start',
      date: `${year}-09-06`,
      icon: Sun,
      titleEn: 'Fall term begins',
      titleTr: 'Güz dönemi başlıyor',
      tone: 'success' as const,
    },
    {
      id: 'republic',
      date: `${year}-10-25`,
      icon: PartyPopper,
      titleEn: 'Republic Day celebration',
      titleTr: 'Cumhuriyet Bayramı kutlaması',
      tone: 'danger' as const,
    },
    {
      id: 'winter-break',
      date: `${year}-12-20`,
      icon: Snowflake,
      titleEn: 'Winter break begins',
      titleTr: 'Kış tatili başlıyor',
      tone: 'neutral' as const,
    },
    {
      id: 'spring-start',
      date: `${year + 1}-01-10`,
      icon: Sun,
      titleEn: 'Spring term begins',
      titleTr: 'Bahar dönemi başlıyor',
      tone: 'success' as const,
    },
    {
      id: 'childrens-day',
      date: `${year + 1}-04-25`,
      icon: PartyPopper,
      titleEn: "Children's Day festival",
      titleTr: 'Çocuk Bayramı şenliği',
      tone: 'gold' as const,
    },
    {
      id: 'year-end',
      date: `${year + 1}-06-06`,
      icon: GraduationCap,
      titleEn: 'Year-end ceremony',
      titleTr: 'Yıl sonu töreni',
      tone: 'marti' as const,
    },
  ]
}

export function CalendarSection() {
  const { t, locale, intlLocale } = useI18n()
  const year = currentSchoolYear()

  const { fallDates, springDates, keyDates } = useMemo(() => {
    const fall = saturdaysBetween(new Date(year, 8, 1), new Date(year, 11, 20))
    const spring = saturdaysBetween(new Date(year + 1, 0, 10), new Date(year + 1, 5, 10))
    return { fallDates: fall, springDates: spring, keyDates: buildKeyDates(year) }
  }, [year])

  const todayKey = new Date().toISOString().slice(0, 10)

  const renderTerm = (label: string, dates: string[]) => (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900">{label}</h3>
        <Badge tone="marti" size="sm">
          {dates.length} {t('classes.sessions')}
        </Badge>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {dates.map((date) => {
          const isPast = date < todayKey
          return (
            <span
              key={date}
              title={formatDate(date, intlLocale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              className={`inline-flex h-9 min-w-[3.25rem] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                isPast
                  ? 'bg-ink-100 text-ink-400'
                  : 'bg-marti-50 text-marti-700 ring-1 ring-inset ring-marti-100'
              }`}
            >
              {formatDate(date, intlLocale, { month: 'short', day: 'numeric' })}
            </span>
          )
        })}
      </div>
    </div>
  )

  return (
    <Section id={SECTION_IDS.calendar} tone="tint" className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.calendar')}
          title={t('calendar.title')}
          subtitle={t('calendar.subtitle', { year: formatSchoolYear(year) })}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>{renderTerm(t('calendar.termFall'), fallDates)}</Reveal>
          <Reveal delay={0.1}>{renderTerm(t('calendar.termSpring'), springDates)}</Reveal>
        </div>

        {/* Key dates timeline */}
        <div className="mt-16">
          <SectionHeading eyebrow={t('calendar.upcoming')} title={t('calendar.eventsTitle')} />
          <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {keyDates.map((event) => {
              const Icon = event.icon
              return (
                <StaggerItem key={event.id}>
                  <div className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-marti-50 text-marti-600 transition-colors duration-300 group-hover:bg-marti-600 group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">
                        {locale === 'tr' ? event.titleTr : event.titleEn}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {formatDate(event.date, intlLocale, {
                          weekday: 'short',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerGroup>
        </div>

        {/* Saturday timetable */}
        <div className="mt-16">
          <SectionHeading eyebrow={t('calendar.timeTitle')} title={t('calendar.timeTitle')} />
          <Reveal className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <ul className="divide-y divide-ink-100">
              {SATURDAY_SCHEDULE.map((slot) => (
                <li
                  key={slot.time}
                  className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-marti-50/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marti-50 text-marti-600">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="w-14 shrink-0 font-display text-sm font-bold text-marti-600">
                    {slot.time}
                  </span>
                  <span className="text-sm font-medium text-ink-800">{t(slot.labelKey)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
