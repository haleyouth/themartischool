import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'sunshine' | 'white'
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

/**
 * Buttons use a chunky offset shadow that presses down on click. It is the
 * detail that makes the whole interface read as a children's school rather
 * than a corporate dashboard.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-marti-600 text-white shadow-pop hover:bg-marti-500 btn-pop',
  secondary: 'bg-marti-50 text-marti-700 ring-2 ring-marti-200 hover:bg-marti-100',
  outline: 'bg-white text-ink-700 ring-2 ring-cream-200 hover:ring-marti-300 hover:text-marti-700',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-coral-500 text-white shadow-[0_6px_0_0_rgb(190_18_60)] hover:bg-coral-400 btn-pop',
  sunshine: 'bg-sunshine-400 text-ink-950 shadow-pop-amber hover:bg-sunshine-300 btn-pop',
  white: 'bg-white text-marti-700 shadow-[0_6px_0_0_rgb(219_215_204)] hover:bg-cream-50 btn-pop',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-3xl',
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
    'transition-all duration-150 ease-out',
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
