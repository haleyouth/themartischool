import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Live date and time in the portal header.
 *
 * Plain text, no chrome. The weekday and date sit quietly above a larger
 * time, so the eye reads the hour first and the context second. Digits roll
 * only when their own value changes, so the seconds tick without the hours
 * twitching alongside them.
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
  const date = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(now)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return (
    <div className={cn('select-none text-right leading-none', className)}>
      <p className="flex items-center justify-end gap-1.5">
        {isSaturday && (
          <motion.span
            // A slow breath rather than a badge, since there is no chrome now.
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.82, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
            aria-hidden
          />
        )}
        <span
          className={cn(
            'text-[10px] font-extrabold uppercase tracking-[0.14em]',
            isSaturday ? 'text-amber-600' : 'text-ink-400',
          )}
        >
          {isSaturday ? t('dash.schoolDay') : weekday}
        </span>
      </p>

      <p className="mt-1.5 flex items-baseline justify-end gap-2">
        <span className="font-display text-[13px] font-bold text-ink-500">{date}</span>
        <span className="flex items-baseline font-display text-xl font-extrabold tabular-nums text-ink">
          <Digits value={hours} />
          <Colon />
          <Digits value={minutes} />
          {/* Seconds sit smaller and lighter, so the glance lands on the hour. */}
          <Digits value={seconds} className="ml-1 text-[13px] text-ink-400" />
        </span>
      </p>
    </div>
  )
}

/**
 * Rolls a two digit group when it changes.
 *
 * Fixed at two characters wide so the header never shifts as digits swap,
 * which would otherwise make the whole bar jitter once a second.
 */
function Digits({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-[1.1em] w-[2ch] items-baseline justify-center overflow-hidden',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 36, mass: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
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
      animate={{ opacity: [1, 0.15, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className="mx-[0.5px] text-ink-300"
    >
      :
    </motion.span>
  )
}
