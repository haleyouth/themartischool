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
        'rounded-2xl border border-ink-100 bg-white shadow-soft',
        hover && 'card-hover',
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
      className={cn('flex items-start justify-between gap-4 border-b border-ink-100 p-5', className)}
      {...props}
    >
      <div className="min-w-0">
        {title && <h3 className="text-base font-semibold text-ink-900">{title}</h3>}
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
      className={cn('flex items-center gap-3 border-t border-ink-100 bg-ink-50/50 p-5', className)}
      {...props}
    />
  )
}

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
  accent?: 'marti' | 'gold' | 'crimson' | 'emerald'
  className?: string
}) {
  const accents = {
    marti: 'bg-marti-50 text-marti-600',
    gold: 'bg-gold-50 text-gold-600',
    crimson: 'bg-crimson-50 text-crimson-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-950">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-medium',
                trend.positive ? 'text-emerald-600' : 'text-crimson-600',
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
              accents[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
