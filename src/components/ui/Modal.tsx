import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Set false for destructive flows that must be dismissed deliberately. */
  closeOnBackdrop?: boolean
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape to close, and lock body scroll while open.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Move focus into the dialog so keyboard and screen-reader users land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-2xl',
              sizes[size],
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-cream-200 p-5 sm:p-6">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-lg font-bold text-ink-950">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('a11y.closeDialog')}
                  className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="scrollbar-thin flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-cream-200 bg-cream-100/60 p-5 sm:p-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
