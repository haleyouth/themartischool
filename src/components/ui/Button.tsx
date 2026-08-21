import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-marti-600 text-white shadow-soft hover:bg-marti-700 hover:shadow-lift active:bg-marti-800',
  secondary: 'bg-marti-50 text-marti-700 hover:bg-marti-100 active:bg-marti-200',
  outline:
    'border border-ink-200 bg-white text-ink-700 hover:border-marti-300 hover:bg-marti-50 hover:text-marti-700',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-crimson-600 text-white shadow-soft hover:bg-crimson-700 active:bg-crimson-800',
  gold: 'bg-gold-500 text-white shadow-soft hover:bg-gold-600 active:bg-gold-700',
  white: 'bg-white text-marti-700 shadow-soft hover:bg-marti-50 hover:shadow-lift',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  /** Renders a react-router Link that looks identical to the button. */
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
    'group relative inline-flex items-center justify-center font-medium',
    'transition-all duration-200 ease-out active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marti-600 focus-visible:ring-offset-2',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
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
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  )
})
