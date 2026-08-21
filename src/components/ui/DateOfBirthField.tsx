import { AnimatePresence, motion } from 'framer-motion'
import { Cake, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Day / month / year pickers instead of a native date input.
 *
 * A native `<input type="date">` looks different in every browser, hides its
 * expected order behind a locale, and opens a calendar that makes a parent
 * page back roughly fifteen years to reach their child's birth year. Three
 * plain selects are faster for a known date, look identical everywhere, and
 * let us confirm the age back to the parent as they fill it in.
 *
 * Value is the canonical 'YYYY-MM-DD' the rest of the app and Firestore use.
 */
export function DateOfBirthField({
  value,
  onChange,
  error,
  label,
  minAge = 3,
  maxAge = 18,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  label: string
  minAge?: number
  maxAge?: number
}) {
  const { t, intlLocale } = useI18n()

  // Track the three parts locally. Deriving them from `value` alone does not
  // work, because value is only emitted once all three are chosen, so a
  // partial selection would be discarded on the next render.
  const [parts, setParts] = useState(() => {
    const [y = '', m = '', d = ''] = value ? value.split('-') : []
    return { year: y, month: m, day: d }
  })

  // Adopt an externally supplied value, e.g. when the form is reset.
  useEffect(() => {
    if (!value) return
    const [y = '', m = '', d = ''] = value.split('-')
    setParts((prev) =>
      prev.year === y && prev.month === m && prev.day === d ? prev : { year: y, month: m, day: d },
    )
  }, [value])

  const { year, month, day } = parts

  // Offer a couple of years either side of the accepted range so a parent can
  // always find their child's year; the exact bound is enforced on submit.
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const newest = currentYear - minAge + 1
    const oldest = currentYear - maxAge - 1
    return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i)
  }, [currentYear, minAge, maxAge])

  // Month names in the reader's own language.
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(
          new Date(2000, i, 1),
        ),
      })),
    [intlLocale],
  )

  // Only offer days that exist in the chosen month, so 31 February is unpickable.
  const daysInMonth =
    year && month ? new Date(Number(year), Number(month), 0).getDate() : 31
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')),
    [daysInMonth],
  )

  function update(part: 'y' | 'm' | 'd', next: string) {
    const y = part === 'y' ? next : year
    const m = part === 'm' ? next : month
    let d = part === 'd' ? next : day

    // Shorten the day if the new month cannot hold it (e.g. 31 -> 30).
    if (y && m && d) {
      const max = new Date(Number(y), Number(m), 0).getDate()
      if (Number(d) > max) d = String(max).padStart(2, '0')
    }

    setParts({ year: y, month: m, day: d })
    onChange(y && m && d ? `${y}-${m}-${d}` : '')
  }

  /** Whole years old today, or null until the date is complete. */
  const age = useMemo(() => {
    if (!year || !month || !day) return null
    const birth = new Date(Number(year), Number(month) - 1, Number(day))
    if (Number.isNaN(birth.getTime())) return null
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    const beforeBirthday =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    if (beforeBirthday) years--
    return years
  }, [year, month, day])

  const ageInRange = age !== null && age >= minAge && age <= maxAge

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-ink-700">
        {label}
        <span className="ml-1 text-magenta-500">*</span>
      </label>

      <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2.5">
        <SelectPart
          aria-label={t('register.dobDay')}
          value={day}
          onChange={(next) => update('d', next)}
          placeholder={t('register.dobDay')}
          invalid={!!error}
          options={days.map((d) => ({ value: d, label: String(Number(d)) }))}
        />
        <SelectPart
          aria-label={t('register.dobMonth')}
          value={month}
          onChange={(next) => update('m', next)}
          placeholder={t('register.dobMonth')}
          invalid={!!error}
          options={months}
        />
        <SelectPart
          aria-label={t('register.dobYear')}
          value={year}
          onChange={(next) => update('y', next)}
          placeholder={t('register.dobYear')}
          invalid={!!error}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>

      {/* Reading the age back is the fastest way for a parent to spot a slip. */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm font-semibold text-magenta-600"
            role="alert"
          >
            {error}
          </motion.p>
        ) : age !== null ? (
          <motion.p
            key="age"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
              ageInRange ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700',
            )}
          >
            <Cake className="h-3.5 w-3.5" aria-hidden />
            {t('register.dobAge', { age: String(age) })}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-ink-500"
          >
            {t('register.dobHint')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function SelectPart({
  value,
  onChange,
  placeholder,
  options,
  invalid,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: { value: string; label: string }[]
  invalid?: boolean
  'aria-label': string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full appearance-none rounded-2xl border-2 bg-white pl-3.5 pr-9 text-sm font-semibold text-ink',
          'transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-marti-500/20',
          value ? 'text-ink' : 'text-ink-400',
          invalid
            ? 'border-magenta-300 focus:border-magenta-500'
            : 'border-ink-200 hover:border-marti-200 focus:border-marti-500',
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
    </div>
  )
}
