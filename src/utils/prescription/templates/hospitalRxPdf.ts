export type PrescriptionPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string }
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
  }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
}

type RxPdfExtras = {
  tokenNo?: string
  investigations?: Array<{ label: string; checked?: boolean }>
}

export async function previewHospitalRxPdf(data: PrescriptionPdfData & RxPdfExtras) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const blue     = { r: 37,  g: 99,  b: 235 }
  const slate    = { r: 15,  g: 23,  b: 42  }
  const softBlue = { r: 240, g: 249, b: 255 }
  const softRed  = { r: 255, g: 241, b: 242 }
  const red      = { r: 185, g: 28,  b: 28  }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()

  const marginX = 10
  let y = 10

  // ── Header ──────────────────────────────────────────────────────────────────
  const logo = String((settings as any).logoDataUrl || '')
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      pdf.addImage(normalized, 'PNG' as any, W / 2 - 5, y, 10, 10, undefined, 'FAST')
      y += 11
    } catch {}
  }

  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(String(settings.name || 'Hospital'), W / 2, y + 6, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text('Medical Prescription', W / 2, y + 11, { align: 'center' })

  y += 18
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.6)
  pdf.line(marginX, y, W - marginX, y)
  y += 6

  // ── Patient + Meta (two columns) ─────────────────────────────────────────
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')

  const leftX  = marginX
  const rightX = W / 2 + 4
  const rowH   = 4.5

  const kv = (label: string, value: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value || '-', x + 22, yy)
  }

  const startY = y
  kv('Patient Name:', String(patient.name  || '-'), leftX, y); y += rowH
  kv('Age:',         String(patient.age    || '-'), leftX, y); y += rowH
  kv('Gender:',      String(patient.gender || '-'), leftX, y); y += rowH
  kv('Phone:',       String(patient.phone  || '-'), leftX, y); y += rowH
  kv('Address:',     String(patient.address|| '-'), leftX, y); y += rowH

  let y2 = startY
  kv('MR Number:',  String(patient.mrn || '-'),                          rightX, y2); y2 += rowH
  kv('Token #:',    String((data as any).tokenNo || '-'),                rightX, y2); y2 += rowH
  kv('Date:',       String(dt.toLocaleDateString()),                     rightX, y2); y2 += rowH
  kv('Doctor:',     String(doctor.name ? `Dr. ${doctor.name}` : '-'),   rightX, y2); y2 += rowH
  kv('Department:', String((doctor as any).departmentName || '-'),       rightX, y2); y2 += rowH

  y = Math.max(y, y2) + 6

  // ── Layout constants ─────────────────────────────────────────────────────
  const leftColW  = 40
  const gap       = 6
  const rightColX = marginX + leftColW + gap
  const rightColW = W - marginX - rightColX

  // ── Vitals box ───────────────────────────────────────────────────────────
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.4)

  const v = (data as any).vitals || {}
  const vitalsList = [
    { label: 'BP',    value: fmtBp(v) },
    { label: 'Pulse', value: fmt(v.pulse) },
    { label: 'Temp',  value: fmt(v.temperatureC) },
    { label: 'RR',    value: fmt(v.respiratoryRate) },
    { label: 'SpO2',  value: fmt(v.spo2) },
    { label: 'BS',    value: fmt(v.bloodSugar) },
    { label: 'Wt',    value: fmt(v.weightKg) },
    { label: 'Ht',    value: fmt(v.heightCm) },
    { label: 'BMI',   value: fmt(v.bmi) },
    { label: 'BSA',   value: fmt(v.bsa) },
  ].filter(item => item.value !== '— —')

  const vitalsHeight = Math.max(28, 10 + vitalsList.length * 4.5)

  roundedRect(pdf, marginX, y, leftColW, vitalsHeight, 2)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.setFontSize(9)
  pdf.text('VITAL SIGNS', marginX + 2, y + 5)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)

  let vitY = y + 9
  for (const vital of vitalsList.slice(0, 12)) {
    pdf.text(`${vital.label}: ${vital.value}`, marginX + 2, vitY)
    vitY += 4.5
  }

  // ── Tests box (below vitals) ─────────────────────────────────────────────
  const labTests  = (data.labTests        || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  const hasTests  = labTests.length > 0 || diagTests.length > 0

  let testsSectionHeight = 0
  if (hasTests) {
    const maxLab  = Math.min(labTests.length,  3)
    const maxDiag = Math.min(diagTests.length, 3)
    const testsHeight =
      14 +
      (labTests.length  > 0 ? 4 : 0) + maxLab  * 4 + (labTests.length  > 3 ? 4 : 0) +
      (diagTests.length > 0 ? 4 : 0) + maxDiag * 4 + (diagTests.length > 3 ? 4 : 0)

    testsSectionHeight = testsHeight + 6
    const testsY = y + vitalsHeight + 6

    roundedRect(pdf, marginX, testsY, leftColW, testsHeight, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(blue.r, blue.g, blue.b)
    pdf.text('TESTS', marginX + 2, testsY + 5)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)

    let testY = testsY + 10

    if (labTests.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Lab:', marginX + 2, testY)
      pdf.setFont('helvetica', 'normal')
      testY += 4
      for (const test of labTests.slice(0, 3)) {
        pdf.text(`• ${String(test)}`, marginX + 4, testY)
        testY += 4
      }
      if (labTests.length > 3) {
        pdf.text(`+${labTests.length - 3} more`, marginX + 4, testY)
        testY += 4
      }
    }

    if (diagTests.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Diag:', marginX + 2, testY)
      pdf.setFont('helvetica', 'normal')
      testY += 4
      for (const test of diagTests.slice(0, 3)) {
        pdf.text(`• ${String(test)}`, marginX + 4, testY)
        testY += 4
      }
      if (diagTests.length > 3) {
        pdf.text(`+${diagTests.length - 3} more`, marginX + 4, testY)
        testY += 4
      }
    }
  }

  // ── Rx big box ───────────────────────────────────────────────────────────
  const rxY             = y
  const leftColTotal    = vitalsHeight + testsSectionHeight
  const rxH             = Math.max(180, leftColTotal)

  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.7)
  roundedRect(pdf, rightColX, rxY, rightColW, rxH, 3)

  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Rx', rightColX + 6, rxY + 12)

  let contentY = rxY + 18
  const contentX = rightColX + 6
  const contentW = rightColW - 12

  // Helper: add a labelled section
  const addSection = (label: string, value: string | undefined) => {
    if (!value || !String(value).trim()) return
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(blue.r, blue.g, blue.b)
    pdf.text(`${label}:`, contentX, contentY)
    contentY += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    const lines = (pdf as any).splitTextToSize(String(value), contentW - 10)
    pdf.text(lines, contentX + 4, contentY)
    contentY += lines.length * 3.5 + 3
  }

  addSection('Primary Complaint',               data.primaryComplaint)
  addSection('Risk Factors / Medical History',  data.history)
  addSection('History of Primary Complaint',    data.primaryComplaintHistory)
  addSection('Family History',                  data.familyHistory)
  addSection('Allergy History',                 data.allergyHistory)
  addSection('Treatment History',               data.treatmentHistory)
  addSection('Examination Findings',            data.examFindings)
  addSection('Diagnosis / Disease',             data.diagnosis)
  addSection('Advice / Referral',               data.advice)

  // ── Medicines Table (FIXED) ──────────────────────────────────────────────
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    contentY += 3
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(blue.r, blue.g, blue.b)
    pdf.text('PRESCRIBED MEDICINES', contentX, contentY)
    contentY += 6

    // 7 fixed columns that sum exactly to contentW (~132mm):
    //  # (6) | Medicine (35) | Dosage (18) | Duration (18) | Frequency (22) | Route (15) | Instruction (18) = 132
    const colWidths = [6, 35, 18, 18, 22, 15, 18]
    const headers   = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction']

    // Header row background
    pdf.setFillColor(softBlue.r, softBlue.g, softBlue.b)
    pdf.setDrawColor(blue.r, blue.g, blue.b)
    pdf.rect(contentX, contentY - 4, contentW, 6, 'FD')
    pdf.setFontSize(7)
    pdf.setTextColor(slate.r, slate.g, slate.b)

    let colX = contentX
    headers.forEach((h, i) => {
      pdf.text(h, colX + 1, contentY)
      colX += colWidths[i]
    })
    contentY += 6

    // Data rows
    pdf.setFont('helvetica', 'normal')
    meds.forEach((m, i) => {
      const rowY        = contentY
      const name        = String(m?.name        || '').trim()
      const dose        = String(m?.dose        || '').trim()
      const duration    = String(m?.duration    || '').trim()
      const freq        = String(m?.frequency   || '').trim()
      const route       = String(m?.route       || '').trim()
      const instruction = String(m?.instruction || '').trim()

      colX = contentX

      // # ─────────────────────────────────────────────────────
      pdf.text(String(i + 1), colX + 1, rowY)
      colX += colWidths[0]

      // Medicine (wrapped to column width) ───────────────────
      const nameLines = (pdf as any).splitTextToSize(name, colWidths[1] - 2)
      pdf.text(nameLines, colX + 1, rowY)
      colX += colWidths[1]

      // Dosage ───────────────────────────────────────────────
      pdf.text(dose, colX + 1, rowY)
      colX += colWidths[2]

      // Duration ─────────────────────────────────────────────
      pdf.text(duration, colX + 1, rowY)
      colX += colWidths[3]

      // Frequency ────────────────────────────────────────────
      pdf.text(freq, colX + 1, rowY)
      colX += colWidths[4]

      // Route ────────────────────────────────────────────────
      pdf.text(route, colX + 1, rowY)
      colX += colWidths[5]

      // Instruction (wrapped to column width) ────────────────
      const instLines = (pdf as any).splitTextToSize(instruction, colWidths[6] - 2)
      pdf.text(instLines, colX + 1, rowY)

      // Row separator
      const rowHeight = Math.max(nameLines.length, instLines.length) * 3 + 2
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.1)
      pdf.line(contentX, rowY + rowHeight - 1, contentX + contentW, rowY + rowHeight - 1)

      contentY += rowHeight
    })
  }

  // ── Doctor Signature ─────────────────────────────────────────────────────
  const signY = rxY + rxH + 10
  pdf.setDrawColor(slate.r, slate.g, slate.b)
  pdf.setLineWidth(0.2)
  pdf.line(marginX, signY, marginX + 55, signY)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.text('Doctor Signature', marginX, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(doctor.name ? `Dr. ${doctor.name}` : ''), marginX, signY + 8)

  // ── Not Valid bar ────────────────────────────────────────────────────────
  const nvY = H - 28
  pdf.setFillColor(softRed.r, softRed.g, softRed.b)
  pdf.setDrawColor(254, 202, 202)
  pdf.roundedRect(marginX, nvY, W - 2 * marginX, 8, 1.5, 1.5, 'FD')
  pdf.setTextColor(red.r, red.g, red.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('⚠ NOT VALID FOR COURT ⚠', W / 2, nvY + 5.5, { align: 'center' })

  // ── Contact box ──────────────────────────────────────────────────────────
  const cbY = H - 18
  pdf.setFillColor(softBlue.r, softBlue.g, softBlue.b)
  pdf.setDrawColor(186, 230, 253)
  pdf.roundedRect(marginX, cbY, W - 2 * marginX, 12, 2.5, 2.5, 'FD')
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(`Phone: ${String(settings.phone   || '+92-xxx-xxxxxx')}`,                    W / 2, cbY + 5,   { align: 'center' })
  pdf.text(`Address: ${String(settings.address || 'Hospital Address, City, Country')}`, W / 2, cbY + 9.5, { align: 'center' })

  // ── Output ───────────────────────────────────────────────────────────────
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = pdf.output('datauristring') as string
      await api.printPreviewPdf(dataUrl)
      return
    }
  } catch {}

  const blob = pdf.output('blob') as Blob
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : '— —'
}

function fmtBp(v: any) {
  const sys = v?.bloodPressureSys
  const dia = v?.bloodPressureDia
  if (sys != null && dia != null) return `${sys}/${dia}`
  return '— —'
}

function roundedRect(pdf: any, x: number, y: number, w: number, h: number, r: number) {
  try { pdf.roundedRect(x, y, w, h, r, r) } catch { pdf.rect(x, y, w, h) }
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas    = document.createElement('canvas')
          canvas.width    = img.naturalWidth  || img.width  || 200
          canvas.height   = img.naturalHeight || img.height || 200
          const ctx       = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0)
          const out = canvas.toDataURL('image/png')
          resolve(out || src)
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return src }
}
