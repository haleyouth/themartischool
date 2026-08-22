import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

/**
 * The public timetable.
 *
 * Reads the curated mirror rather than the classes collection, because a class
 * document carries studentIds and teacherIds and must stay closed. A trigger
 * keeps this in step, holding only what a prospectus would print.
 */
export interface PublicClass {
  id: string
  name: string
  subject: string
  gradeLevels: string[]
  startTime: string
  endTime: string
  room: string | null
  capacity: number
  enrolledCount: number
  spacesLeft: number
  description: string | null
  schoolYear: number | null
}

export function usePublicClasses() {
  const [classes, setClasses] = useState<PublicClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'publicClasses'), orderBy('name', 'asc')),
      (snapshot) => {
        setClasses(
          snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as PublicClass),
            id: docSnap.id,
          })),
        )
        setLoading(false)
      },
      (error) => {
        // A visitor should still see the page if this read fails.
        console.error('Public classes subscription failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { classes, loading }
}
