import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Live date and time for the portal header.
 *
 * The time is the anchor, set large and tabular. The weekday and date sit
 * beneath it in a quieter line. Each digit animates in its own box, and the
 * boxes are sized in `em` against a tabular figure so glyphs are never
 * cramped and the row never changes width as the numbers roll.
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
      <div className="flex flex-col items-end">
        {/* The time, reading as one unit to assistive tech. */}
        <div
          className="flex items-baseline font-display text-[22px] font-extrabold leading-none text-ink"
          role="timer"
          aria-label={`${hours}:${minutes}`}
        >
          <Pair value={hours} reduced={reduced} />
          <Colon reduced={reduced} />
          <Pair value={minutes} reduced={reduced} />
          <Pair
            value={seconds}
            reduced={reduced}
            className="ml-1.5 text-[13px] font-bold text-ink-400"
          />
        </div>

        {/* Context beneath: the date, and whether school is on. */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] font-bold leading-none text-ink-500">{date}</span>
          <span className="h-2.5 w-px bg-ink-200" aria-hidden />
          <span className="flex items-center gap-1.5">
            {isSaturday && (
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <motion.span
                  animate={reduced ? undefined : { scale: [1, 2.6], opacity: [0.7, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-amber-400"
                />
                <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
            )}
            <span
              className={cn(
                'text-[10px] font-extrabold uppercase leading-none tracking-[0.12em]',
                isSaturday ? 'text-amber-600' : 'text-ink-400',
              )}
            >
              {isSaturday ? t('dash.schoolDay') : weekday}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/** A two digit group, each digit animated independently. */
function Pair({
  value,
  reduced,
  className,
}: {
  value: string
  reduced: boolean | null
  className?: string
}) {
  return (
    <span className={cn('flex tabular-nums', className)} aria-hidden>
      {value.split('').map((digit, index) => (
        // Index is a stable slot here, not a list identity: position 0 is
        // always the tens digit, so keying on it is correct.
        <Digit key={index} value={digit} reduced={reduced} />
      ))}
    </span>
  )
}

/**
 * One digit in a fixed box.
 *
 * The box is 0.62em wide, which matches a tabular figure in this face with a
 * little air either side. Sizing in `em` means it scales with the font size
 * rather than needing a separate value per use.
 */
function Digit({ value, reduced }: { value: string; reduced: boolean | null }) {
  return (
    <span className="relative inline-block h-[1.05em] w-[0.62em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduced ? { opacity: 0 } : { y: '-105%', opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { y: '0%', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: '105%', opacity: 0 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 480, damping: 36, mass: 0.5 }
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
function Colon({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.span
      aria-hidden
      animate={reduced ? undefined : { opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      className="mx-[0.06em] text-ink-300"
    >
      :
    </motion.span>
  )
}
