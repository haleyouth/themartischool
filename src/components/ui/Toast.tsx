import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  kind: ToastKind
  message: string
  description?: string
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string, description?: string) => void
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const kinds: Record<ToastKind, { icon: typeof Info; className: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50',
    iconClass: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    className: 'border-crimson-200 bg-crimson-50',
    iconClass: 'text-crimson-600',
  },
  warning: {
    icon: AlertCircle,
    className: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-600',
  },
  info: { icon: Info, className: 'border-marti-200 bg-marti-50', iconClass: 'text-marti-600' },
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (kind: ToastKind, message: string, description?: string) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, kind, message, description }])
      // Errors linger longer — they usually carry something to act on.
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, description) => toast('success', message, description),
      error: (message, description) => toast('error', message, description),
      info: (message, description) => toast('info', message, description),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          role="region"
          aria-live="polite"
          aria-label="Notifications"
          className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        >
          <AnimatePresence initial={false}>
            {toasts.map((item) => {
              const { icon: Icon, className, iconClass } = kinds[item.kind]
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-card backdrop-blur',
                    className,
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{item.message}</p>
                    {item.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:text-ink-700"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
