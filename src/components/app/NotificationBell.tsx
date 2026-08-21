import { AnimatePresence, motion } from 'framer-motion'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { db } from '@/lib/firebase'
import { useNotifications } from '@/lib/hooks'
import { cn, formatRelative } from '@/lib/utils'

export function NotificationBell() {
  const t = useT()
  const auth = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: notifications } = useNotifications(auth.user?.uid, 20)
  const unread = notifications.filter((n) => !n.isRead)

  // Dismiss on outside click or Escape.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function markAllRead() {
    if (!unread.length) return
    const batch = writeBatch(db)
    // Rules allow a recipient to flip only isRead/readAt on their own docs.
    for (const item of unread) {
      batch.update(doc(db, 'notifications', item.id), {
        isRead: true,
        readAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  async function openNotification(id: string, link: string | null, isRead: boolean) {
    if (!isRead) {
      const batch = writeBatch(db)
      batch.update(doc(db, 'notifications', id), { isRead: true, readAt: serverTimestamp() })
      await batch.commit()
    }
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('a11y.notifications')}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson-600 px-1 text-[10px] font-bold text-white"
          >
            {unread.length > 9 ? '9+' : unread.length}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-bold text-ink-900">{t('dash.notifications')}</p>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-marti-600 transition-colors hover:text-marti-800"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('dash.markAllRead')}
                </button>
              )}
            </div>

            <div className="scrollbar-thin max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-500">
                  {t('dash.noNotifications')}
                </p>
              ) : (
                <ul className="divide-y divide-ink-50">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(item.id, item.link, item.isRead)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-50',
                          !item.isRead && 'bg-marti-50/50',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            item.isRead ? 'bg-ink-200' : 'bg-marti-600',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink-900">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                            {item.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-ink-400">
                            {formatRelative(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/app/notifications')
              }}
              className="block w-full border-t border-ink-100 bg-ink-50/60 px-4 py-3 text-center text-xs font-semibold text-marti-600 transition-colors hover:bg-ink-100"
            >
              {t('common.viewAll')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
