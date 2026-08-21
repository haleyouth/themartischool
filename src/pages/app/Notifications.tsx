import { motion } from 'framer-motion'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { db } from '@/lib/firebase'
import { useNotifications } from '@/lib/hooks'
import { cn, formatRelative } from '@/lib/utils'

export default function Notifications() {
  const { t } = useI18n()
  const auth = useAuth()
  const navigate = useNavigate()
  const { data: notifications, loading } = useNotifications(auth.user?.uid, 100)

  const unread = notifications.filter((n) => !n.isRead)

  async function markAllRead() {
    if (!unread.length) return
    const batch = writeBatch(db)
    for (const item of unread) {
      batch.update(doc(db, 'notifications', item.id), {
        isRead: true,
        readAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  async function remove(id: string) {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'notifications', id))
    await batch.commit()
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t('dash.notifications')}
          </h1>
          {unread.length > 0 && (
            <p className="mt-1.5 text-sm text-ink-600">
              {unread.length} {t('messages.unread')}
            </p>
          )}
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            onClick={markAllRead}
            leftIcon={<CheckCheck className="h-4 w-4" />}
          >
            {t('dash.markAllRead')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={5} cols={2} />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<Bell className="h-6 w-6" />}
              title={t('dash.noNotifications')}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {notifications.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  className={cn(
                    'group flex gap-3 px-5 py-4 transition-colors hover:bg-cream-200',
                    !item.isRead && 'bg-marti-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      item.isRead ? 'bg-ink-200' : 'bg-marti-600',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => item.link && navigate(item.link)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{item.title}</span>
                      {item.priority === 'high' && (
                        <Badge tone="danger" size="sm">
                          !
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.body}</p>
                    <p className="mt-1.5 text-xs text-ink-400">
                      {formatRelative(item.createdAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={t('common.delete')}
                    className="h-8 shrink-0 rounded-lg p-2 text-ink-300 opacity-0 transition-all hover:bg-magenta-50 hover:text-magenta-600 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  )
}
