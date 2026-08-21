import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Live date and time in the portal header, as plain text.
 *
 * Digits roll only when their own value changes, so the seconds tick over
 * without the hours and minutes twitching alongside them. Saturday is called
 * out, because the whole school runs on that one day.
 */
export function LiveClock({ className }: { className?: string }) {
  const { intlLocale, t } = useI18n()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Align the first tick to the next whole second, otherwise the display
    // sits visibly out of step with the system clock.
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
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long' }).format(now)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return (
    <div className={cn('select-none text-right leading-tight', className)}>
      <p className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
        {isSaturday && (
          <motion.span
            // A quiet pulse rather than a badge, since there is no chrome now.
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
            aria-hidden
          />
        )}
        <span className={cn(isSaturday && 'text-amber-600')}>
          {weekday}
          {isSaturday ? ` · ${t('dash.schoolDay')}` : ''}
        </span>
      </p>

      <p className="mt-0.5 flex items-baseline justify-end gap-1.5 font-display text-sm font-extrabold text-ink">
        <span>{date}</span>
        <span className="tabular-nums">
          <Digits value={hours} />
          <Colon />
          <Digits value={minutes} />
          <Colon />
          <Digits value={seconds} className="text-ink-400" />
        </span>
      </p>
    </div>
  )
}

/**
 * Rolls a two digit group upward when it changes.
 *
 * The wrapper is inline-flex with a fixed character width so the surrounding
 * text never shifts as digits swap, which would otherwise make the whole
 * header jitter once a second.
 */
function Digits({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn('relative inline-flex h-[1.15em] w-[2ch] overflow-hidden align-baseline', className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '110%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.6 }}
          className="absolute inset-0 inline-flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** The separator pulses once a second, which is what makes a clock read live. */
function Colon() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className="mx-[1px] inline-block text-ink-300"
    >
      :
    </motion.span>
  )
}
