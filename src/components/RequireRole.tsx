import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import type { Role } from '@/types/models'

/**
 * Route guard. This is a convenience for the UI only — the authoritative
 * check happens in Firestore rules and in every callable, so a user who
 * forges their way past this still cannot read or write anything.
 */
export function RequireRole({
  roles,
  children,
  fallback = '/app',
}: {
  roles?: Role[]
  children: ReactNode
  fallback?: string
}) {
  const auth = useAuth()
  const location = useLocation()
  const t = useT()

  if (auth.status === 'loading') return <PageLoader label={t('common.loading')} />

  if (auth.status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && auth.role && !roles.includes(auth.role)) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
