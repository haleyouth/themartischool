import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Live date and time in the portal header.
 *
 * Each digit animates only when it actually changes, so the seconds tick over
 * without the minutes and hours flickering alongside them. Saturday is called
 * out, because the whole school runs on that one day.
 */
export function LiveClock({ className }: { className?: string }) {
  const { intlLocale, t } = useI18n()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Align the first tick to the next whole second so the display does not
    // sit visibly out of step with the system clock.
    let interval: ReturnType<typeof setInterval>
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 1000)
    }, 1000 - (Date.now() % 1000))

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  const isSaturday = now.getDay() === 6

  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'long' }).format(now)
  const date = new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
  }).format(now)

  const hours = new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    hour12: false,
  }).format(now)
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border-2 px-3.5 py-2',
        isSaturday ? 'border-ink bg-amber-100' : 'border-ink-200 bg-white',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          isSaturday ? 'bg-amber-400 text-ink' : 'bg-marti-50 text-marti-600',
        )}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
      </span>

      <div className="leading-tight">
        <p className="text-[11px] font-bold text-ink-500">
          {weekday}
          {isSaturday && (
            <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-px text-[9px] font-extrabold uppercase text-ink">
              {t('dash.schoolDay')}
            </span>
          )}
        </p>
        <p className="flex items-baseline gap-1 font-display text-sm font-extrabold text-ink">
          <span>{date}</span>
          <span className="text-ink-300">·</span>
          <span className="tabular-nums">
            <TimePart value={hours} />
            <Blink />
            <TimePart value={minutes} />
            <Blink />
            <TimePart value={seconds} className="text-ink-400" />
          </span>
        </p>
      </div>
    </div>
  )
}

/** Rolls a two digit group upward whenever its value changes. */
function TimePart({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('relative inline-block overflow-hidden align-baseline', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** The separator pulses once a second, which is what makes a clock read live. */
function Blink() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.25, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className="mx-px inline-block"
    >
      :
    </motion.span>
  )
}
