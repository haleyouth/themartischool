import { avatarColor, cn, initials } from '@/lib/utils'

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
  ring = false,
}: {
  name: string
  src?: string | null
  size?: keyof typeof sizes
  className?: string
  ring?: boolean
}) {
  const base = cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase',
    sizes[size],
    ring && 'ring-2 ring-white',
    className,
  )

  if (src) {
    return <img src={src} alt={name} className={cn(base, 'object-cover')} loading="lazy" />
  }

  return (
    <span className={cn(base, avatarColor(name))} aria-label={name} title={name}>
      {initials(name)}
    </span>
  )
}

/** Overlapping avatars for class rosters and conversation participants. */
export function AvatarGroup({
  names,
  max = 4,
  size = 'sm',
}: {
  names: string[]
  max?: number
  size?: keyof typeof sizes
}) {
  const shown = names.slice(0, max)
  const overflow = names.length - shown.length

  return (
    <div className="flex -space-x-2">
      {shown.map((name, index) => (
        <Avatar key={`${name}-${index}`} name={name} size={size} ring />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-ink-200 font-semibold text-ink-600 ring-2 ring-white',
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
