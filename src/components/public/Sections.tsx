import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { cn } from '@/lib/utils'

/** Rounded pill that sits above a section heading. */
export function SectionEyebrow({
  children,
  tone = 'light',
  emoji,
}: {
  children: ReactNode
  tone?: 'light' | 'dark'
  emoji?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide',
        tone === 'light'
          ? 'bg-white text-marti-700 shadow-soft ring-2 ring-marti-100'
          : 'bg-white/15 text-white ring-2 ring-white/20',
      )}
    >
      {emoji ? <span aria-hidden>{emoji}</span> : <span className="h-2 w-2 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  eyebrowEmoji,
  title,
  subtitle,
  align = 'center',
  tone = 'light',
  className,
}: {
  eyebrow?: string
  eyebrowEmoji?: string
  title: ReactNode
  subtitle?: string
  align?: 'center' | 'left'
  tone?: 'light' | 'dark'
  className?: string
}) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <SectionEyebrow tone={tone} emoji={eyebrowEmoji}>
          {eyebrow}
        </SectionEyebrow>
      )}
      <h2
        className={cn(
          'mt-5 text-balance font-display text-3xl font-extrabold leading-[1.15] sm:text-[2.6rem]',
          tone === 'light' ? 'text-ink' : 'text-white',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-4 text-pretty text-base leading-relaxed sm:text-lg',
            tone === 'light' ? 'text-ink-600' : 'text-marti-100',
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}

export function Section({
  children,
  className,
  id,
  tone = 'cream',
}: {
  children: ReactNode
  className?: string
  id?: string
  tone?: 'cream' | 'white' | 'dark'
}) {
  const tones = {
    cream: 'bg-cream-200',
    white: 'bg-cream',
    dark: 'bg-marti-800',
  }

  return (
    <section id={id} className={cn('relative py-20 sm:py-24', tones[tone], className)}>
      {children}
    </section>
  )
}

/**
 * Soft wave divider between sections. Keeps the page feeling hand-made rather
 * than a stack of rectangles.
 */
export function WaveDivider({
  from = 'fill-cream-200',
  flip = false,
  className,
}: {
  from?: string
  flip?: boolean
  className?: string
}) {
  return (
    <div className={cn('pointer-events-none -mt-px w-full leading-none', className)} aria-hidden>
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className={cn('h-[40px] w-full sm:h-[60px]', from, flip && 'rotate-180')}
      >
        <path d="M0,32 C240,64 480,0 720,20 C960,40 1200,64 1440,36 L1440,60 L0,60 Z" />
      </svg>
    </div>
  )
}
