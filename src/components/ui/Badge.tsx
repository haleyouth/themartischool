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
  neutral: 'bg-cream-100 text-ink-700 ring-cream-200',
  marti: 'bg-marti-50 text-marti-700 ring-marti-200',
  success: 'bg-mint-50 text-mint-700 ring-mint-200',
  mint: 'bg-mint-50 text-mint-700 ring-mint-200',
  warning: 'bg-sunshine-50 text-sunshine-700 ring-sunshine-200',
  gold: 'bg-sunshine-50 text-sunshine-700 ring-sunshine-200',
  sunshine: 'bg-sunshine-50 text-sunshine-700 ring-sunshine-200',
  danger: 'bg-coral-50 text-coral-700 ring-coral-200',
  coral: 'bg-coral-50 text-coral-700 ring-coral-200',
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
