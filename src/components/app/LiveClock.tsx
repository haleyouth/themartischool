import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Live date and time for the portal header.
 *
 * Built as a grid rather than inline text, because the two lines must stay
 * right aligned to the same edge while the digits underneath keep changing
 * width class. Each digit is animated on its own, so the seconds roll without
 * disturbing the hours beside them, and every glyph box is a fixed width so
 * the header never shifts as the numbers change.
 */
export function LiveClock({ className }: { className?: string }) {
  const { intlLocale, t } = useI18n()
  const reduced = useReducedMotion()
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
    <div className={cn('select-none', className)}>
      <div className="flex flex-col items-end gap-1">
        {/* Context line: which day it is, and whether school is on. */}
        <div className="flex items-center gap-1.5">
          {isSaturday && (
            <motion.span
              className="relative flex h-1.5 w-1.5"
              aria-hidden
              initial={false}
            >
              <motion.span
                animate={reduced ? undefined : { scale: [1, 2.4], opacity: [0.7, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-amber-400"
              />
              <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
            </motion.span>
          )}
          <span
            className={cn(
              'text-[10px] font-extrabold uppercase leading-none tracking-[0.16em]',
              isSaturday ? 'text-amber-600' : 'text-ink-400',
            )}
          >
            {isSaturday ? t('dash.schoolDay') : weekday}
          </span>
        </div>

        {/* Time line: date, then the clock itself. */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold leading-none text-ink-500">{date}</span>
          <span className="h-3 w-px bg-ink-200" aria-hidden />
          <span
            className="flex items-center font-display text-lg font-extrabold leading-none text-ink"
            // One accessible label, so a screen reader reads a time rather
            // than a stream of separately animated digits.
            role="timer"
            aria-label={`${hours}:${minutes}`}
          >
            <Group value={hours} reduced={reduced} />
            <Separator reduced={reduced} />
            <Group value={minutes} reduced={reduced} />
            <Group value={seconds} reduced={reduced} className="ml-1.5 text-xs text-ink-400" />
          </span>
        </div>
      </div>
    </div>
  )
}

/** A two digit group, animated one digit at a time. */
function Group({
  value,
  reduced,
  className,
}: {
  value: string
  reduced: boolean | null
  className?: string
}) {
  return (
    <span className={cn('flex', className)} aria-hidden>
      {value.split('').map((digit, index) => (
        // Index is a stable position here, not a list identity, so keying on
        // it is correct: slot 0 is always the tens digit.
        <Digit key={index} value={digit} reduced={reduced} />
      ))}
    </span>
  )
}

/**
 * One digit in a fixed width box.
 *
 * The box is sized in `ch` so it never resizes as the glyph changes, which is
 * what stops the header jittering once a second.
 */
function Digit({ value, reduced }: { value: string; reduced: boolean | null }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62ch] overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduced ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { y: '0%', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: '100%', opacity: 0 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 500, damping: 38, mass: 0.45 }
          }
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** The colon pulses once a second, which is what makes a clock read live. */
function Separator({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.span
      aria-hidden
      animate={reduced ? undefined : { opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className="px-[1px] text-ink-300"
    >
      :
    </motion.span>
  )
}
