import { motion } from 'framer-motion'
import { BookOpen, Clock, MapPin, Users } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { CardSkeleton, EmptyState } from '@/components/ui/Feedback'
import { useI18n } from '@/i18n'
import { useMyClasses } from '@/lib/hooks'
import { currentSchoolYear, formatSchoolYear } from '@/lib/schoolYear'
import { formatTime, percent } from '@/lib/utils'

export default function Classes() {
  const { t, intlLocale } = useI18n()
  const { data: classes, loading } = useMyClasses()

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t('classes.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          {t('classes.subtitle', { year: formatSchoolYear(currentSchoolYear()) })}
        </p>
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t('classes.noClasses')}
          description={t('classes.noClassesBody')}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls, index) => {
            const fill = percent(cls.enrolledCount, cls.capacity)
            const full = cls.enrolledCount >= cls.capacity

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.4) }}
              >
                <Card hover className="h-full">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marti-50 text-marti-600">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <Badge tone={statusTone(cls.status)} size="sm">
                        {t(`classes.status${cap(cls.status)}`)}
                      </Badge>
                    </div>

                    <h2 className="mt-4 font-display text-lg font-bold text-ink">
                      {cls.name}
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-marti-600">
                      {t(`classes.subject${subjectKey(cls.subject)}`)}
                    </p>

                    {cls.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-600">
                        {cls.description}
                      </p>
                    )}

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-ink-600">
                        <Clock className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                        {formatTime(cls.startTime, intlLocale)} -{' '}
                        {formatTime(cls.endTime, intlLocale)}
                      </div>
                      {cls.room && (
                        <div className="flex items-center gap-2 text-ink-600">
                          <MapPin className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                          {cls.room}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-ink-600">
                        <Users className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                        {cls.enrolledCount} / {cls.capacity} {t('programs.students')}
                      </div>
                    </dl>

                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fill}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${
                            full ? 'bg-magenta-500' : fill > 80 ? 'bg-amber-500' : 'bg-marti-600'
                          }`}
                        />
                      </div>
                      {full && (
                        <p className="mt-1.5 text-xs font-medium text-magenta-600">
                          {t('classes.full')}
                        </p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** 'turkish_language' -> 'Turkish' to match the i18n key names. */
function subjectKey(subject: string) {
  const map: Record<string, string> = {
    turkish_language: 'Turkish',
    culture: 'Culture',
    history: 'History',
    music: 'Music',
    folk_dance: 'FolkDance',
    religion: 'Religion',
    other: 'Other',
  }
  return map[subject] ?? 'Other'
}
