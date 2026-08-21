import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { cn } from '@/lib/utils'

/** Small pill above a section heading. */
export function SectionEyebrow({
  children,
  tone = 'light',
}: {
  children: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider',
        tone === 'light' ? 'bg-marti-50 text-marti-700' : 'bg-white/10 text-marti-200',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  tone = 'light',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  align?: 'center' | 'left'
  tone?: 'light' | 'dark'
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && <SectionEyebrow tone={tone}>{eyebrow}</SectionEyebrow>}
      <h2
        className={cn(
          'mt-4 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl',
          tone === 'light' ? 'text-ink-950' : 'text-white',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-4 text-pretty text-base leading-relaxed',
            tone === 'light' ? 'text-ink-600' : 'text-ink-300',
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}

/** Standard vertical rhythm for a marketing section. */
export function Section({
  children,
  className,
  id,
  tone = 'white',
}: {
  children: ReactNode
  className?: string
  id?: string
  tone?: 'white' | 'tint' | 'dark'
}) {
  const tones = {
    white: 'bg-white',
    tint: 'bg-gradient-to-b from-marti-50/60 via-white to-white',
    dark: 'bg-ink-950',
  }

  return (
    <section id={id} className={cn('relative py-20 sm:py-24', tones[tone], className)}>
      {children}
    </section>
  )
}

/** Page header used by every inner marketing page. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-marti-50 via-marti-50/40 to-white pb-16 pt-32 sm:pb-20 sm:pt-40">
      <div className="bg-dots absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-marti-200/40 blur-3xl"
        aria-hidden
      />
      <div className="container-marti relative">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      </div>
    </section>
  )
}
