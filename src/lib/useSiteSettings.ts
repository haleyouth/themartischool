import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

/**
 * Public site settings, held in a single document.
 *
 * `siteContent` is world readable and admin writable, so a visitor can see
 * whether registration is open without signing in, and only a director or
 * principal can change it. Closing registration is a soft gate for the UI;
 * the firestore rules still decide whether a submission is accepted.
 */
export interface SiteSettings {
  registrationOpen: boolean
  /** Shown in place of the form when registration is closed. */
  registrationClosedMessage: string | null
  updatedAt?: unknown
  updatedBy?: string | null
}

export const SITE_SETTINGS_PATH = 'siteContent/settings'

const DEFAULTS: SiteSettings = {
  registrationOpen: true,
  registrationClosedMessage: null,
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, SITE_SETTINGS_PATH),
      (snap) => {
        // Missing document means the school has never touched the setting,
        // so registration stays open rather than silently closing.
        setSettings(snap.exists() ? { ...DEFAULTS, ...(snap.data() as SiteSettings) } : DEFAULTS)
        setLoading(false)
      },
      (error) => {
        console.error('Site settings subscription failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { settings, loading }
}

/** Admin only. The rules reject this for anyone else. */
export async function setRegistrationOpen(
  open: boolean,
  uid: string,
  closedMessage?: string | null,
) {
  await setDoc(
    doc(db, SITE_SETTINGS_PATH),
    {
      registrationOpen: open,
      registrationClosedMessage: closedMessage ?? null,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  )
}
