import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

/**
 * Mirrors the timetable into a public collection.
 *
 * The class document carries `studentIds` and `teacherIds`, so it cannot be
 * opened to visitors without exposing who is enrolled. This trigger copies
 * only the fields a printed prospectus would carry, into a collection that is
 * world readable and server-write-only.
 *
 * Draft and cancelled classes are removed from the mirror rather than shown,
 * so the public list is always what the school is actually running.
 */
export const syncPublicClass = onDocumentWritten(
  { document: 'classes/{classId}', region: 'us-central1' },
  async (event) => {
    const db = getFirestore()
    const classId = event.params.classId
    const publicRef = db.doc(`publicClasses/${classId}`)
    const after = event.data?.after?.data()

    // Deleted, or no longer something a family can join.
    if (!after || after.status !== 'active') {
      await publicRef.delete().catch(() => undefined)
      return
    }

    await publicRef.set(
      {
        id: classId,
        name: after.name ?? '',
        subject: after.subject ?? 'other',
        gradeLevels: after.gradeLevels ?? [],
        startTime: after.startTime ?? '',
        endTime: after.endTime ?? '',
        room: after.room ?? null,
        capacity: after.capacity ?? 0,
        // A count, never the identities behind it.
        enrolledCount: after.enrolledCount ?? 0,
        spacesLeft: Math.max(0, (after.capacity ?? 0) - (after.enrolledCount ?? 0)),
        description: after.description ?? null,
        schoolYear: after.schoolYear ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  },
)
