import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-cream-100 disabled:text-ink-400'

const fieldOk = 'border-ink-200 focus:border-marti-500 focus:ring-marti-500/10'
const fieldError = 'border-coral-400 focus:border-coral-500 focus:ring-coral-500/10'

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-coral-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-coral-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightIcon, className, wrapperClassName, id, required, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${fieldId}-desc` : undefined}
          className={cn(
            fieldBase,
            'h-11',
            error ? fieldError : fieldOk,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            {rightIcon}
          </span>
        )}
      </div>
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, rows = 4, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={!!error}
        className={cn(fieldBase, 'py-2.5 leading-relaxed', error ? fieldError : fieldOk, className)}
        {...props}
      />
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string
  options?: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, wrapperClassName, id, required, options, children, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={!!error}
        className={cn(
          fieldBase,
          'h-11 cursor-pointer appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23667794\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\'/%3E%3C/svg%3E")] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
          error ? fieldError : fieldOk,
          className,
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </FieldShell>
  )
})

export function Checkbox({
  label,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: string }) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className={cn('flex cursor-pointer items-start gap-3 text-sm text-ink-700', className)}
      >
        <input
          id={fieldId}
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-ink-300 text-marti-600 transition-colors focus:ring-2 focus:ring-marti-500/30 focus:ring-offset-0"
          aria-invalid={!!error}
          {...props}
        />
        <span className="leading-relaxed">{label}</span>
      </label>
      {error && (
        <p className="flex items-center gap-1.5 pl-7 text-xs font-medium text-coral-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

/** Segmented radio group, used for attendance status and similar choices. */
export function RadioPills<T extends string>({
  value,
  onChange,
  options,
  name,
  size = 'md',
}: {
  value: T | null
  onChange: (value: T) => void
  options: { value: T; label: string; activeClass?: string }[]
  name: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-medium transition-all duration-200 active:scale-95',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? option.activeClass || 'bg-marti-600 text-white shadow-soft'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
