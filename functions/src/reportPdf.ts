import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import PDFDocument from 'pdfkit'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { requireAuth, writeAudit } from './shared'

/** MARTI blue, and the deep purple ink the rest of the school uses. */
const BLUE = '#1b79c0'
const INK = '#2d1b4d'
const MUTED = '#6d5493'
const RULE = '#d5cbe3'
const CREAM = '#fef8ea'

const SCORE_ROWS = [
  ['participation', 'Taking part'],
  ['speaking', 'Speaking'],
  ['reading', 'Reading'],
  ['writing', 'Writing'],
  ['listening', 'Listening'],
  ['behavior', 'Behaviour'],
  ['homework', 'Homework'],
] as const

const PAGE_MARGIN = 54

/**
 * Renders a published progress report as a PDF and returns a signed link.
 *
 * Only published reports are rendered. A draft is a teacher's working note and
 * must never leave the building as a document, so the guard here matches the
 * one in the security rules rather than trusting the caller.
 *
 * Who may fetch one:
 *  - the family the report is about
 *  - the teacher who wrote it
 *  - a principal or director
 */
export const generateReportPdf = onCall<{ reportId: string }>(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const caller = requireAuth(request)
    const { reportId } = request.data ?? {}
    if (!reportId) throw new HttpsError('invalid-argument', 'A report id is required.')

    const db = getFirestore()
    const snap = await db.doc(`performanceReports/${reportId}`).get()
    if (!snap.exists) throw new HttpsError('not-found', 'Report not found.')
    const report = snap.data()!

    const isAdmin = caller.role === 'director' || caller.role === 'principal'
    const isAuthor = report.teacherId === caller.uid
    const isTheFamily = report.uid === caller.uid

    if (!isAdmin && !isAuthor && !isTheFamily) {
      throw new HttpsError('permission-denied', 'You cannot read that report.')
    }
    // A family only ever sees a published report, never a draft in progress.
    if (report.status !== 'published' && isTheFamily) {
      throw new HttpsError('failed-precondition', 'That report has not been published yet.')
    }

    const student = await db.doc(`students/${report.studentId}`).get()
    const studentName = student.exists
      ? `${student.data()!.firstName} ${student.data()!.lastName}`
      : report.studentId

    const pdf = await renderPdf({
      report,
      studentName,
      gradeLevel: student.exists ? (student.data()!.gradeLevel as string) : '',
      guardianName: student.exists ? (student.data()!.guardianName as string) : '',
    })

    const path = `reports/${report.studentId}/${reportId}.pdf`
    const file = getStorage().bucket().file(path)
    await file.save(pdf, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'private, max-age=0',
        metadata: { reportId, studentId: report.studentId },
      },
    })

    // A short lived link: long enough to open or save, not to pass around.
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    })

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'report.pdf',
      targetType: 'report',
      targetId: reportId,
    })

    return { url, path, filename: `${report.studentId}-${report.periodEnd}.pdf` }
  },
)

interface RenderInput {
  report: FirebaseFirestore.DocumentData
  studentName: string
  gradeLevel: string
  guardianName: string
}

/** Draws the report and resolves once the document is fully written. */
function renderPdf(input: RenderInput): Promise<Buffer> {
  const { report, studentName, gradeLevel, guardianName } = input

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Progress report, ${studentName}`,
        Author: 'The Marti School',
        Subject: `${report.className}, ${report.periodEnd}`,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const width = doc.page.width - PAGE_MARGIN * 2

    /* Masthead */
    const logo = join(__dirname, '..', 'assets', 'marti-logo.png')
    if (existsSync(logo)) {
      // Height constrained so a wide wordmark keeps its proportions.
      doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { height: 34 })
    } else {
      doc.font('Helvetica-Bold').fontSize(20).fillColor(BLUE).text('MARTI', PAGE_MARGIN, PAGE_MARGIN)
    }

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text('The Marti School', PAGE_MARGIN, PAGE_MARGIN + 2, { width, align: 'right' })
      .text('Maryland Turkish-American Inhabitants', { width, align: 'right' })
      .text('9115 Guilford Rd, Suite 200, Columbia, MD 21046', { width, align: 'right' })

    doc
      .moveTo(PAGE_MARGIN, PAGE_MARGIN + 48)
      .lineTo(PAGE_MARGIN + width, PAGE_MARGIN + 48)
      .lineWidth(2)
      .strokeColor(BLUE)
      .stroke()

    doc.y = PAGE_MARGIN + 66

    /* Title */
    doc
      .font('Helvetica-Bold')
      .fontSize(19)
      .fillColor(INK)
      .text('Progress report', PAGE_MARGIN, doc.y)

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `${titleCase(String(report.periodType))} report, ${report.term} term ${report.schoolYear}`,
        { width },
      )

    doc.moveDown(1.2)

    /* Who this is about */
    const detailsTop = doc.y
    const boxHeight = 76
    doc.roundedRect(PAGE_MARGIN, detailsTop, width, boxHeight, 8).fillColor(CREAM).fill()

    const col = width / 3
    const details: [string, string][] = [
      ['Student', studentName],
      ['Student ID', String(report.studentId)],
      ['Grade', gradeLevel || '-'],
      ['Class', String(report.className)],
      ['Teacher', String(report.teacherName)],
      ['Period ending', String(report.periodEnd)],
    ]

    details.forEach(([label, value], index) => {
      const x = PAGE_MARGIN + 14 + (index % 3) * col
      const y = detailsTop + 14 + Math.floor(index / 3) * 30
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), x, y, {
        width: col - 14,
        characterSpacing: 0.6,
      })
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(value, x, y + 11, { width: col - 14, ellipsis: true, lineBreak: false })
    })

    doc.y = detailsTop + boxHeight + 22

    /* Scores */
    sectionHeading(doc, 'How the term went', width)

    const scores = (report.scores ?? {}) as Record<string, number>
    const barX = PAGE_MARGIN + 170
    const barWidth = width - 170 - 42

    for (const [key, label] of SCORE_ROWS) {
      const value = Number(scores[key] ?? 0)
      const y = doc.y

      doc.font('Helvetica').fontSize(10).fillColor(INK).text(label, PAGE_MARGIN, y, { width: 160 })

      // Track, then the filled portion. Five is full marks.
      doc.roundedRect(barX, y + 1, barWidth, 9, 4.5).fillColor('#ece7f2').fill()
      if (value > 0) {
        doc
          .roundedRect(barX, y + 1, Math.max(9, (barWidth * value) / 5), 9, 4.5)
          .fillColor(BLUE)
          .fill()
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(MUTED)
        .text(`${value} / 5`, barX + barWidth + 8, y, { width: 34, align: 'right' })

      doc.y = y + 20
    }

    if (report.overallGrade) {
      doc.moveDown(0.4)
      const y = doc.y
      doc.roundedRect(PAGE_MARGIN, y, 150, 34, 8).fillColor(BLUE).fill()
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#dbeefe')
        .text('OVERALL', PAGE_MARGIN + 14, y + 7, { characterSpacing: 0.6 })
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#ffffff')
        .text(String(report.overallGrade), PAGE_MARGIN + 14, y + 16)
      doc.y = y + 46
    }

    /* Written sections */
    const written: [string, string | null][] = [
      ['What went well', report.strengths],
      ['What to work on', report.areasForImprovement],
      ['Teacher comments', report.teacherComments],
      ['What to try at home', report.recommendedActions],
    ]

    for (const [heading, text] of written) {
      if (!text || !String(text).trim()) continue

      // Keep a heading with at least a little of its text.
      if (doc.y > doc.page.height - 150) doc.addPage()

      sectionHeading(doc, heading, width)
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(INK)
        .text(String(text).trim(), PAGE_MARGIN, doc.y, { width, lineGap: 3 })
      doc.moveDown(1)
    }

    /* Signature strip */
    if (doc.y > doc.page.height - 130) doc.addPage()
    doc.moveDown(1)

    const signTop = doc.y
    const half = (width - 24) / 2
    for (const [index, label] of ['Teacher', 'Parent or guardian'].entries()) {
      const x = PAGE_MARGIN + index * (half + 24)
      doc
        .moveTo(x, signTop + 26)
        .lineTo(x + half, signTop + 26)
        .lineWidth(0.8)
        .strokeColor(RULE)
        .stroke()
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, x, signTop + 31)
    }
    if (guardianName) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(guardianName, PAGE_MARGIN + half + 24, signTop + 43)
    }

    /* Footer on every page */
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const footerY = doc.page.height - 46
      doc
        .moveTo(PAGE_MARGIN, footerY - 10)
        .lineTo(PAGE_MARGIN + width, footerY - 10)
        .lineWidth(0.8)
        .strokeColor(RULE)
        .stroke()
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(
          `The Marti School  ·  Published ${formatStamp(report.publishedAt)}  ·  Page ${
            i - range.start + 1
          } of ${range.count}`,
          PAGE_MARGIN,
          footerY,
          { width, align: 'center' },
        )
    }

    doc.end()
  })
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string, width: number) {
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(BLUE)
    .text(text.toUpperCase(), PAGE_MARGIN, doc.y, { width, characterSpacing: 0.8 })
  doc.moveDown(0.45)
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Firestore timestamps arrive as objects, so normalise before formatting. */
function formatStamp(value: unknown): string {
  const date =
    value && typeof (value as { toDate?: () => Date }).toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : new Date()
  return date.toISOString().slice(0, 10)
}
