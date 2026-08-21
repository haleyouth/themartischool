import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

/**
 * Solid buttons sit above a hard ink shadow and press into it on hover, then
 * further on click. Ghost buttons have no shadow, so they stay flat.
 */
const variants: Record<Variant, string> = {
  primary: 'border-2 border-ink bg-marti-600 text-white hover:bg-marti-500 press',
  secondary: 'border-2 border-ink bg-cream-200 text-ink hover:bg-cream-300 press',
  outline: 'border-2 border-ink bg-white text-ink hover:bg-cream-200 press',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink',
  danger: 'border-2 border-ink bg-magenta-600 text-white hover:bg-magenta-500 press',
  amber: 'border-2 border-ink bg-amber-400 text-ink hover:bg-amber-300 press',
  white: 'border-2 border-ink bg-white text-marti-700 hover:bg-cream-200 press',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-2xl',
  icon: 'h-11 w-11 rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  to?: string
  href?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    to,
    href,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  const classes = cn(
    'group relative inline-flex items-center justify-center font-bold',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marti-500/40 focus-visible:ring-offset-2',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
})
