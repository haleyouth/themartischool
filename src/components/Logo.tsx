import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

const sizes = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12',
  xl: 'h-16',
  '2xl': 'h-24',
  '3xl': 'h-32',
}

/**
 * The MARTI wordmark. The source PNG is dark blue on white, so on dark
 * backgrounds we invert it to white rather than shipping a second asset.
 */
export function Logo({
  size = 'md',
  tone = 'color',
  withText = false,
  className,
  linkTo = '/',
}: {
  size?: keyof typeof sizes
  tone?: 'color' | 'white'
  withText?: boolean
  className?: string
  linkTo?: string | null
}) {
  const t = useT()

  const image = (
    <img
      src="/marti-logo.png"
      alt={t('brand.name')}
      className={cn(
        sizes[size],
        'w-auto object-contain transition-transform duration-300',
        tone === 'white' && 'brightness-0 invert',
      )}
    />
  )

  const content = (
    <span className={cn('group inline-flex items-center gap-3', className)}>
      {image}
      {withText && (
        <span className="hidden sm:block">
          <span
            className={cn(
              'block font-display text-sm font-bold leading-tight',
              tone === 'white' ? 'text-white' : 'text-ink',
            )}
          >
            {t('brand.name')}
          </span>
          <span
            className={cn(
              'block text-[11px] leading-tight',
              tone === 'white' ? 'text-white/70' : 'text-ink-500',
            )}
          >
            {t('brand.full')}
          </span>
        </span>
      )}
    </span>
  )

  if (!linkTo) return content

  return (
    <Link to={linkTo} className="inline-flex shrink-0 items-center" aria-label={t('brand.name')}>
      {content}
    </Link>
  )
}
