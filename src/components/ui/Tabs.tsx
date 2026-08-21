import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
}

/**
 * Underlined tab bar. The active indicator is a shared layoutId, so it slides
 * between tabs rather than jumping.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  variant = 'underline',
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  variant?: 'underline' | 'pills'
}) {
  const layoutId = useId()

  if (variant === 'pills') {
    return (
      <div
        role="tablist"
        className={cn('inline-flex gap-1 rounded-xl bg-ink-100 p-1', className)}
      >
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                active ? 'text-marti-700' : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-lg bg-white shadow-soft"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {item.icon}
                {item.label}
                {item.count !== undefined && (
                  <span className="rounded-full bg-ink-200 px-1.5 py-px text-[10px] font-semibold text-ink-600">
                    {item.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-6 overflow-x-auto border-b border-ink-200', className)}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 whitespace-nowrap pb-3 pt-1 text-sm font-medium transition-colors',
              active ? 'text-marti-700' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-semibold',
                  active ? 'bg-marti-100 text-marti-700' : 'bg-ink-100 text-ink-600',
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-marti-600"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
