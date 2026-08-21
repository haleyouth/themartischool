import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone =
  | 'neutral'
  | 'marti'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'violet'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  marti: 'bg-marti-50 text-marti-700 ring-marti-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-crimson-50 text-crimson-700 ring-crimson-200',
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
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
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
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
