import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone =
  | 'neutral'
  | 'marti'
  | 'success'
  | 'mint'
  | 'warning'
  | 'gold'
  | 'sunshine'
  | 'danger'
  | 'coral'
  | 'grape'
  | 'violet'

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-200 text-ink-700 ring-ink-200',
  marti: 'bg-marti-50 text-marti-700 ring-marti-200',
  success: 'bg-teal-50 text-teal-700 ring-teal-200',
  mint: 'bg-teal-50 text-teal-700 ring-teal-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  gold: 'bg-amber-50 text-amber-700 ring-amber-200',
  sunshine: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-magenta-50 text-magenta-700 ring-magenta-200',
  coral: 'bg-magenta-50 text-magenta-700 ring-magenta-200',
  grape: 'bg-grape-50 text-grape-700 ring-grape-200',
  violet: 'bg-grape-50 text-grape-700 ring-grape-200',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
  size = 'md',
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold ring-2 ring-inset',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

/** Maps a domain status string onto a consistent colour, in one place. */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'approved':
    case 'active':
    case 'published':
    case 'present':
    case 'completed':
      return 'success'
    case 'pending':
    case 'under_review':
    case 'draft':
    case 'provisioning':
    case 'late':
      return 'warning'
    case 'rejected':
    case 'suspended':
    case 'absent':
    case 'cancelled':
    case 'provisioning_failed':
    case 'withdrawn':
      return 'danger'
    case 'waitlisted':
    case 'excused':
    case 'submitted':
      return 'marti'
    case 'graduated':
      return 'gold'
    default:
      return 'neutral'
  }
}
