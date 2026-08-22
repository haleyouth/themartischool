import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import PDFDocument from 'pdfkit'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { requireAuth, writeAudit } from './shared'

/** MARTI blue, and the deep purple ink the rest of the school uses. */
const BLUE = '#1b79c0'
const BLUE_DARK = '#1a629b'
const BLUE_PALE = '#dbeefe'
const INK = '#2d1b4d'
const MUTED = '#6d5493'
const FAINT = '#b3a3cb'
const RULE = '#e3ddec'
const CREAM = '#fef8ea'
const TRACK = '#ece7f2'
const BAND = '#faf8fc'

const SCORE_ROWS = [
  ['participation', 'Taking part'],
  ['speaking', 'Speaking'],
  ['reading', 'Reading'],
  ['writing', 'Writing'],
  ['listening', 'Listening'],
  ['behavior', 'Behaviour'],
  ['homework', 'Homework'],
] as const

/**
 * US Letter, 612 x 792 points, because the school is in Maryland and these
 * are printed on domestic paper. Letter is 50pt shorter than A4, so the
 * vertical rhythm below is tuned to keep a normal report on one page.
 */
const PAGE_SIZE = 'LETTER'
const PAGE_MARGIN = 52

/*
 * PDFKit's built in Helvetica is WinAnsi encoded and cannot represent Turkish
 * characters: it rendered 'Ayşe Kaya' as 'AyöR¶lya'. DejaVu Sans covers the
 * full Latin Extended range and is freely redistributable, so it is bundled
 * and embedded instead.
 */
const FONT_DIR = join(__dirname, '..', 'assets')
const REGULAR = 'body'
const BOLD = 'bodyBold'

function registerFonts(doc: PDFKit.PDFDocument) {
  const regular = join(FONT_DIR, 'DejaVuSans.ttf')
  const bold = join(FONT_DIR, 'DejaVuSans-Bold.ttf')
  if (existsSync(regular) && existsSync(bold)) {
    doc.registerFont(REGULAR, regular)
    doc.registerFont(BOLD, bold)
    return true
  }
  return false
}

/**
 * Renders a published progress report as a PDF and returns the bytes.
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

    /*
     * The PDF comes back in the response rather than via Cloud Storage.
     *
     * A report is around 52KB, which is roughly 70KB once base64 encoded,
     * against a 10MB callable limit. Storing it would add a bucket, egress
     * and a second set of permissions to reason about, and would leave stale
     * copies behind: amend a grade and republish, and any previously issued
     * link still serves the old document. Generating on demand means the PDF
     * always matches the record, and access is re-checked every time.
     */

    await writeAudit({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: 'report.pdf',
      targetType: 'report',
      targetId: reportId,
    })

    return {
      // base64 so the bytes survive the JSON transport.
      pdf: pdf.toString('base64'),
      filename: `${report.studentId}-${report.periodEnd}.pdf`,
    }
  },
)

interface RenderInput {
  report: FirebaseFirestore.DocumentData
  studentName: string
  gradeLevel: string
  guardianName: string
}

/** Draws the report and resolves once the document is fully written. */
export function renderPdf(input: RenderInput): Promise<Buffer> {
  const { report, studentName, gradeLevel, guardianName } = input

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE_SIZE,
      margin: PAGE_MARGIN,
      // Required for bufferedPageRange, which the footer pass relies on.
      bufferPages: true,
      info: {
        Title: `Progress report, ${studentName}`,
        Author: 'The Marti School',
        Subject: `${report.className}, ${report.periodEnd}`,
      },
    })

    // Falls back to the built in faces if the bundle is missing, so a
    // packaging slip degrades the type rather than breaking the render.
    if (!registerFonts(doc)) {
      doc.registerFont(REGULAR, 'Helvetica')
      doc.registerFont(BOLD, 'Helvetica-Bold')
    }

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const width = doc.page.width - PAGE_MARGIN * 2
    const right = PAGE_MARGIN + width

    /* ── Masthead ──────────────────────────────────────────── */

    // A slim blue band across the head reads as letterhead rather than as a
    // printed web page.
    doc.rect(0, 0, doc.page.width, 5).fillColor(BLUE).fill()

    const logo = join(FONT_DIR, 'marti-logo.png')
    const headTop = PAGE_MARGIN - 4
    if (existsSync(logo)) {
      // Height constrained so the wide wordmark keeps its proportions.
      doc.image(logo, PAGE_MARGIN, headTop, { height: 30 })
    } else {
      doc.font(BOLD).fontSize(19).fillColor(BLUE).text('MARTI', PAGE_MARGIN, headTop)
    }

    doc
      .font(BOLD)
      .fontSize(9)
      .fillColor(INK)
      .text('The Marti School', PAGE_MARGIN, headTop, { width, align: 'right' })
    doc
      .font(REGULAR)
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Maryland Turkish-American Inhabitants', { width, align: 'right' })
      .text('9115 Guilford Rd, Suite 200, Columbia, MD 21046', { width, align: 'right' })

    const ruleY = headTop + 42
    doc.moveTo(PAGE_MARGIN, ruleY).lineTo(right, ruleY).lineWidth(1.5).strokeColor(BLUE).stroke()

    /* ── Title ─────────────────────────────────────────────── */

    doc
      .font(BOLD)
      .fontSize(20)
      .fillColor(INK)
      .text('Progress report', PAGE_MARGIN, ruleY + 16, { lineBreak: false })

    doc
      .font(REGULAR)
      .fontSize(9.5)
      .fillColor(MUTED)
      .text(
        `${titleCase(String(report.periodType))} report  ·  ${titleCase(
          String(report.term),
        )} term ${report.schoolYear}`,
        PAGE_MARGIN,
        ruleY + 40,
        { lineBreak: false },
      )

    /* ── Who this is about ─────────────────────────────────── */

    const detailsTop = ruleY + 62
    const boxHeight = 70
    doc.roundedRect(PAGE_MARGIN, detailsTop, width, boxHeight, 6).fillColor(CREAM).fill()
    // A blue spine on the left edge ties the panel back to the letterhead.
    doc.rect(PAGE_MARGIN, detailsTop, 3, boxHeight).fillColor(BLUE).fill()

    const col = (width - 26) / 3
    const details: [string, string][] = [
      ['Student', studentName],
      ['Student ID', String(report.studentId)],
      ['Grade', gradeLevel || '-'],
      ['Class', String(report.className)],
      ['Teacher', String(report.teacherName)],
      ['Period ending', String(report.periodEnd)],
    ]

    details.forEach(([label, value], index) => {
      const x = PAGE_MARGIN + 18 + (index % 3) * col
      const y = detailsTop + 12 + Math.floor(index / 3) * 32
      doc
        .font(REGULAR)
        .fontSize(7)
        .fillColor(FAINT)
        .text(label.toUpperCase(), x, y, {
          width: col - 12,
          characterSpacing: 0.7,
          lineBreak: false,
        })
      doc
        .font(BOLD)
        .fontSize(10)
        .fillColor(INK)
        // One line per field: the panel has fixed row heights, so a wrapped
        // value would overlap the row beneath it.
        // ellipsis only clips when a height bounds the box, otherwise the
        // value wraps and overflows the fixed row beneath it.
        .text(value, x, y + 11, { width: col - 12, height: 12, ellipsis: true, lineBreak: false })
    })

    doc.y = detailsTop + boxHeight + 22

    /* ── Scores ────────────────────────────────────────────── */

    sectionHeading(doc, 'How the term went', width)

    const scores = (report.scores ?? {}) as Record<string, number>
    const labelWidth = 148
    const barX = PAGE_MARGIN + labelWidth
    const barWidth = width - labelWidth - 44
    const rowHeight = 18

    SCORE_ROWS.forEach(([key, label], index) => {
      const value = Math.max(0, Math.min(5, Number(scores[key] ?? 0)))
      const y = doc.y

      // Zebra banding makes a seven row table readable at a glance.
      if (index % 2 === 0) {
        doc.rect(PAGE_MARGIN - 6, y - 4, width + 12, rowHeight).fillColor(BAND).fill()
      }

      doc
        .font(REGULAR)
        .fontSize(9.5)
        .fillColor(INK)
        .text(label, PAGE_MARGIN, y, { width: labelWidth, lineBreak: false })

      doc.roundedRect(barX, y + 1, barWidth, 8, 4).fillColor(TRACK).fill()
      if (value > 0) {
        doc
          .roundedRect(barX, y + 1, Math.max(8, (barWidth * value) / 5), 8, 4)
          .fillColor(BLUE)
          .fill()
      }

      doc
        .font(BOLD)
        .fontSize(9)
        .fillColor(value >= 4 ? BLUE_DARK : MUTED)
        .text(`${value}/5`, barX + barWidth + 10, y, { width: 30, lineBreak: false })

      doc.y = y + rowHeight
    })

    /* Overall grade, set as a badge rather than as another row. */
    if (report.overallGrade) {
      const y = doc.y + 8
      doc.roundedRect(PAGE_MARGIN, y, 124, 36, 6).fillColor(BLUE).fill()
      doc
        .font(REGULAR)
        .fontSize(6.5)
        .fillColor(BLUE_PALE)
        .text('OVERALL GRADE', PAGE_MARGIN + 13, y + 8, {
          characterSpacing: 0.7,
          lineBreak: false,
        })
      doc
        .font(BOLD)
        .fontSize(15)
        .fillColor('#ffffff')
        .text(String(report.overallGrade), PAGE_MARGIN + 13, y + 17, { lineBreak: false })
      doc.y = y + 50
    } else {
      doc.y += 10
    }

    /* ── Written sections ──────────────────────────────────── */

    const written: [string, string | null][] = [
      ['What went well', report.strengths],
      ['What to work on', report.areasForImprovement],
      ['Teacher comments', report.teacherComments],
      ['What to try at home', report.recommendedActions],
    ]

    for (const [heading, text] of written) {
      if (!text || !String(text).trim()) continue

      // Keep a heading with at least some of its text.
      if (doc.y > doc.page.height - 180) doc.addPage()

      sectionHeading(doc, heading, width)
      doc
        .font(REGULAR)
        .fontSize(9.5)
        .fillColor(INK)
        .text(String(text).trim(), PAGE_MARGIN, doc.y, { width, lineGap: 2.5 })
      doc.moveDown(0.85)
    }

    /* ── Signatures ────────────────────────────────────────── */

    /*
     * Pinned above the footer rather than flowed at the cursor. Flowing it
     * left the text engine near the page bottom, and the footer pass then
     * spilled onto a blank page.
     */
    const SIGN_BLOCK = 54
    const FOOTER_ZONE = 48
    const signTopFor = () => doc.page.height - FOOTER_ZONE - SIGN_BLOCK

    if (doc.y > signTopFor() - 10) doc.addPage()
    const signTop = signTopFor()

    const half = (width - 30) / 2
    const signatories: [string, string][] = [
      ['Teacher', String(report.teacherName ?? '')],
      ['Parent or guardian', guardianName ?? ''],
    ]

    signatories.forEach(([label, name], index) => {
      const x = PAGE_MARGIN + index * (half + 30)
      doc
        .moveTo(x, signTop + 22)
        .lineTo(x + half, signTop + 22)
        .lineWidth(0.75)
        .strokeColor(RULE)
        .stroke()
      doc
        .font(REGULAR)
        .fontSize(7)
        .fillColor(FAINT)
        .text(label.toUpperCase(), x, signTop + 27, {
          characterSpacing: 0.6,
          lineBreak: false,
        })
      if (name) {
        doc
          .font(REGULAR)
          .fontSize(8.5)
          .fillColor(MUTED)
          .text(name, x, signTop + 38, { width: half, ellipsis: true, lineBreak: false })
      }
    })

    /* ── Footer on every page ──────────────────────────────── */

    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const footerY = doc.page.height - 36

      doc
        .moveTo(PAGE_MARGIN, footerY - 11)
        .lineTo(right, footerY - 11)
        .lineWidth(0.75)
        .strokeColor(RULE)
        .stroke()

      doc.font(REGULAR).fontSize(7).fillColor(FAINT)

      /*
       * Both halves are positioned by measurement rather than by align.
       *
       * The footer sits below the bottom margin, and align routes the call
       * through LineWrapper even when lineBreak is false. The wrapper treats
       * it as overrun content and appends a blank page.
       */
      doc.text(
        'The Marti School  ·  Published ' + formatStamp(report.publishedAt),
        PAGE_MARGIN,
        footerY,
        { lineBreak: false },
      )

      const pageLabel = 'Page ' + (i - range.start + 1) + ' of ' + range.count
      doc.text(pageLabel, right - doc.widthOfString(pageLabel), footerY, { lineBreak: false })
    }

    doc.flushPages()
    doc.end()
  })
}

/** A short blue tick and a spaced capital label, used above each block. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, width: number) {
  const y = doc.y
  doc.rect(PAGE_MARGIN, y + 1, 2, 8).fillColor(BLUE).fill()
  doc
    .font(BOLD)
    .fontSize(8)
    .fillColor(BLUE)
    .text(text.toUpperCase(), PAGE_MARGIN + 8, y, {
      width: width - 8,
      characterSpacing: 0.9,
      lineBreak: false,
    })
  doc.y = y + 15
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
