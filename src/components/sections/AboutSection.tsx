import { BookHeart, HandHeart, Sparkles, Users2 } from 'lucide-react'
import {
  CountUp,
  Reveal,
  StaggerGroup,
  StaggerItem,
  slideLeft,
  slideRight,
} from '@/components/motion'
import { Section, SectionEyebrow, SectionHeading } from '@/components/public/Sections'
import { useT } from '@/i18n'
import { SCHOOL_STATS } from '@/lib/content'
import { SECTION_IDS } from '@/lib/useScrollSpy'

const VALUE_ICONS = [BookHeart, Users2, Sparkles, HandHeart]

const VALUES = [
  { titleKey: 'about.value1Title', bodyKey: 'about.value1Body' },
  { titleKey: 'about.value2Title', bodyKey: 'about.value2Body' },
  { titleKey: 'about.value3Title', bodyKey: 'about.value3Body' },
  { titleKey: 'about.value4Title', bodyKey: 'about.value4Body' },
]

const LEADERSHIP = [
  { name: 'Dr. Emre Yıldız', roleKey: 'staff.roleDirector', initial: 'EY' },
  { name: 'Fatma Şahin', roleKey: 'staff.rolePrincipal', initial: 'FŞ' },
  { name: 'Ahmet Demir', roleKey: 'staff.roleTeacher', initial: 'AD' },
]

export function AboutSection() {
  const t = useT()

  return (
    <Section id={SECTION_IDS.about} className="scroll-mt-20">
      <div className="container-marti">
        <SectionHeading
          eyebrow={t('nav.about')}
          title={t('about.title')}
          subtitle={t('about.subtitle')}
        />

        {/* Story + mission */}
        <div className="mt-16 grid items-start gap-14 lg:grid-cols-2">
          <Reveal variants={slideRight}>
            <SectionEyebrow>{t('about.storyTitle')}</SectionEyebrow>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-ink-950 sm:text-3xl">
              {t('about.storyTitle')}
            </h3>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-ink-600">
              <p>{t('about.storyP1')}</p>
              <p>{t('about.storyP2')}</p>
              <p>{t('about.storyP3')}</p>
            </div>
          </Reveal>

          <Reveal variants={slideLeft}>
            <div className="rounded-3xl bg-marti-gradient p-8 text-white shadow-lift sm:p-10">
              <SectionEyebrow tone="dark">{t('about.missionTitle')}</SectionEyebrow>
              <p className="mt-5 text-pretty font-display text-xl font-semibold leading-relaxed">
                {t('about.missionBody')}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {SCHOOL_STATS.map((stat) => (
                <div
                  key={stat.labelKey}
                  className="rounded-2xl border border-ink-100 bg-white p-5 text-center shadow-soft transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="font-display text-3xl font-bold text-marti-600">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink-500">{t(stat.labelKey)}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Values */}
        <div className="mt-20">
          <SectionHeading eyebrow={t('brand.short')} title={t('about.valuesTitle')} />
          <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2">
            {VALUES.map((value, index) => {
              const Icon = VALUE_ICONS[index]
              return (
                <StaggerItem key={value.titleKey}>
                  <div className="group flex h-full gap-5 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-marti-200 hover:shadow-card">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marti-50 text-marti-600 transition-all duration-300 group-hover:bg-marti-600 group-hover:text-white">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                      <h4 className="font-display text-base font-bold text-ink-900">
                        {t(value.titleKey)}
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {t(value.bodyKey)}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerGroup>
        </div>

        {/* Leadership */}
        <div className="mt-20">
          <SectionHeading
            eyebrow={t('about.teamTitle')}
            title={t('about.teamTitle')}
            subtitle={t('about.teamSubtitle')}
          />
          <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-3">
            {LEADERSHIP.map((person) => (
              <StaggerItem key={person.name}>
                <div className="group rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift">
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-marti-gradient font-display text-2xl font-bold text-white transition-transform duration-300 group-hover:scale-105">
                    {person.initial}
                  </span>
                  <h4 className="mt-5 font-display text-base font-bold text-ink-900">
                    {person.name}
                  </h4>
                  <p className="mt-1 text-sm text-marti-600">{t(person.roleKey)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </Section>
  )
}
