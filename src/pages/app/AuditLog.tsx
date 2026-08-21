import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { useI18n } from '@/i18n'
import { db } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import type { AuditLogDoc } from '@/types/models'

export default function AuditLog() {
  const { t, intlLocale } = useI18n()
  const [logs, setLogs] = useState<AuditLogDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('at', 'desc'), limit(200)),
      (snapshot) => {
        setLogs(
          snapshot.docs.map((docSnap) => ({ ...(docSnap.data() as AuditLogDoc), id: docSnap.id })),
        )
        setLoading(false)
      },
      (error) => {
        console.error('Audit log subscription failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-950">{t('audit.title')}</h1>
        <p className="mt-1.5 text-sm text-ink-600">{t('audit.subtitle')}</p>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={4} />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<ScrollText className="h-6 w-6" />}
              title={t('audit.noLogs')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('audit.when')}</th>
                    <th className="px-5 py-3 font-semibold">{t('audit.actor')}</th>
                    <th className="px-5 py-3 font-semibold">{t('audit.action')}</th>
                    <th className="px-5 py-3 font-semibold">{t('audit.target')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      className="transition-colors hover:bg-cream-100"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-ink-500">
                        {formatDateTime(log.at, intlLocale)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone="neutral" size="sm">
                          {log.actorRole}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-600">
                        {log.targetType} · {log.targetId}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}
