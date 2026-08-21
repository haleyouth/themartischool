import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  hover = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-4xl border-2 border-cream-200 bg-white shadow-soft',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-card',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  title,
  subtitle,
  action,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  // Omit the DOM `title` attribute so this can accept arbitrary nodes.
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b-2 border-cream-200 p-5',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {title && <h3 className="font-display text-base font-extrabold text-ink-950">{title}</h3>}
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t-2 border-cream-200 bg-cream-100 p-5',
        className,
      )}
      {...props}
    />
  )
}

const STAT_ACCENTS = {
  marti: 'bg-marti-100 text-marti-700',
  gold: 'bg-sunshine-100 text-sunshine-700',
  sunshine: 'bg-sunshine-100 text-sunshine-700',
  coral: 'bg-coral-100 text-coral-700',
  crimson: 'bg-coral-100 text-coral-700',
  mint: 'bg-mint-100 text-mint-700',
  emerald: 'bg-mint-100 text-mint-700',
  grape: 'bg-grape-100 text-grape-700',
} as const

/** Dashboard metric tile. */
export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = 'marti',
  className,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  trend?: { value: string; positive: boolean }
  accent?: keyof typeof STAT_ACCENTS
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-4xl border-2 border-cream-200 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink-950">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-bold',
                trend.positive ? 'text-mint-600' : 'text-coral-600',
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6',
              STAT_ACCENTS[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
