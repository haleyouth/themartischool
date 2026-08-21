import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface AccordionItem {
  question: string
  answer: string
}

/** FAQ accordion. One panel open at a time; the icon rotates into an X. */
export function Accordion({
  items,
  className,
  defaultOpen = null,
}: {
  items: AccordionItem[]
  className?: string
  defaultOpen?: number | null
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen)

  return (
    <div className={cn('divide-y divide-ink-100 overflow-hidden rounded-2xl border-2 border-ink bg-white', className)}>
      {items.map((item, index) => {
        const isOpen = open === index
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-marti-50/40"
            >
              <span
                className={cn(
                  'font-display text-[15px] font-semibold transition-colors',
                  isOpen ? 'text-marti-700' : 'text-ink',
                )}
              >
                {item.question}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                  isOpen ? 'bg-marti-600 text-white' : 'bg-ink-100 text-ink-600',
                )}
              >
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink-600">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
