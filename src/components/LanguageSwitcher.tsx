import { useId } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'en' as const, label: 'EN', full: 'English' },
  { value: 'tr' as const, label: 'TR', full: 'Türkçe' },
]

/**
 * EN / TR toggle. The active pill slides between the two options.
 *
 * The layoutId is scoped per instance with useId. Several switchers are
 * mounted at once (the navbar renders a desktop and a mobile copy, both only
 * hidden by CSS), and a shared layoutId makes Framer Motion animate the pill
 * between those separate instances, so it appears to jump or vanish.
 */
export function LanguageSwitcher({
  className,
  tone = 'light',
}: {
  className?: string
  tone?: 'light' | 'dark'
}) {
  const { locale, setLocale, t } = useI18n()
  const instanceId = useId()

  return (
    <div
      role="group"
      aria-label={t('a11y.switchLanguage')}
      className={cn(
        'relative inline-flex rounded-xl border-2 p-0.5',
        tone === 'light' ? 'border-ink bg-white' : 'border-white/30 bg-white/10 backdrop-blur',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            aria-pressed={active}
            // The two-letter label is not meaningful on its own to a screen
            // reader, so announce the language name instead.
            aria-label={option.full}
            title={option.full}
            className={cn(
              'relative z-10 rounded-[8px] px-2.5 py-1 text-xs font-extrabold transition-colors duration-200',
              active
                ? tone === 'light'
                  ? 'text-white'
                  : 'text-ink'
                : tone === 'light'
                  ? 'text-ink-500 hover:text-ink'
                  : 'text-white/80 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${instanceId}`}
                className={cn(
                  'absolute inset-0 -z-10 rounded-[8px]',
                  tone === 'light' ? 'bg-marti-600' : 'bg-white',
                )}
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
