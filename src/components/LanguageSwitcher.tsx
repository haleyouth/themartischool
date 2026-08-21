import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * EN / TR toggle. The active pill slides between the two options via a shared
 * layoutId, which makes the switch feel like one control rather than two buttons.
 */
export function LanguageSwitcher({
  className,
  tone = 'light',
}: {
  className?: string
  tone?: 'light' | 'dark'
}) {
  const { locale, setLocale, t } = useI18n()

  const options = [
    { value: 'en' as const, label: 'EN' },
    { value: 'tr' as const, label: 'TR' },
  ]

  return (
    <div
      role="group"
      aria-label={t('a11y.switchLanguage')}
      className={cn(
        'relative inline-flex rounded-lg p-0.5',
        tone === 'light' ? 'bg-ink-100' : 'bg-white/15 backdrop-blur',
        className,
      )}
    >
      {options.map((option) => {
        const active = locale === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            aria-pressed={active}
            className={cn(
              'relative z-10 rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors duration-200',
              active
                ? tone === 'light'
                  ? 'text-marti-700'
                  : 'text-marti-800'
                : tone === 'light'
                  ? 'text-ink-500 hover:text-ink-800'
                  : 'text-white/80 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${tone}`}
                className="absolute inset-0 -z-10 rounded-[7px] bg-white shadow-soft"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
