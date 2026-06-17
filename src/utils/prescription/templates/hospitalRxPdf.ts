export type PrescriptionPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; specialization?: string }
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; genericName?: string; company?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; notes?: string; qty?: number | string }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  nextFollowUp?: string
  tokenNo?: string
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
    ar?: string
    va?: string
    iop?: string
  }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
  language?: 'english' | 'urdu'
}

type RxPdfExtras = {
  tokenNo?: string
  investigations?: Array<{ label: string; checked?: boolean }>
  manualRxFields?: Record<string, boolean>
}

export async function previewHospitalRxPdf(data: PrescriptionPdfData & RxPdfExtras) {
  const rawManualRxFields = data.manualRxFields
  const showRx = (k: string) => !rawManualRxFields || rawManualRxFields[k] !== false
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // ── PALETTE: Premium Light Clinical ──────────────────────────────────────
  const teal    = { r: 80,  g: 160, b: 155 }   // soft teal
  const tealDk  = { r: 60,  g: 120, b: 115 }   // teal-dark for text
  const tealLt  = { r: 235, g: 248, b: 246 }   // very light teal tint
  const navy    = { r: 45,  g: 55,  b: 72  }   // soft slate
  const gray    = { r: 130, g: 145, b: 165 }   // medium gray
  const faint   = { r: 250, g: 251, b: 252 }   // almost white
  const border  = { r: 230, g: 235, b: 242 }   // very light border
  const rowAlt  = { r: 248, g: 250, b: 252 }   // alternate row

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  const cw = W - 2 * mx

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — premium light modern header
  // ══════════════════════════════════════════════════════════════════════════
  const hdrH = 18

  // Very light background fill
  pdf.setFillColor(faint.r, faint.g, faint.b)
  pdf.rect(mx, 2, cw, hdrH, 'F')

  // Subtle top border
  pdf.setDrawColor(teal.r, teal.g, teal.b)
  pdf.setLineWidth(0.4)
  pdf.line(mx, 2, W - mx, 2)

  // Logo
  let logoEndX = mx + 4
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePngDataUrl(logoSrc)
      pdf.addImage(norm, 'PNG' as any, mx + 3, 5, 10, 10, undefined, 'FAST')
      logoEndX = mx + 16
    } catch {}
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(String(settings.name || 'Hospital'), logoEndX + 2, 10)

  // Hospital sub-info — single line compact
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  if (addrPhone) pdf.text(addrPhone, logoEndX + 2, 14.5)

  // Doctor name (right side)
  const drX = W - mx - 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, 10, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 14.5, { align: 'right' })
  const spec = String((doctor as any).specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 18, { align: 'right' })

  // Bottom subtle line
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.25)
  pdf.line(mx, hdrH + 1, W - mx, hdrH + 1)

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PATIENT INFO BAND — ultra compact, minimal gap
  // ══════════════════════════════════════════════════════════════════════════
  const patY = hdrH + 2
  const patH = 8

  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.2)
  pdf.rect(mx, patY, cw, patH)

  const pf = (lbl: string, val: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(String(val || '-'), x + 11, yy)
  }

  const py1 = patY + 3.5
  const py2 = patY + 6.5
  const c1 = mx + 4, c2 = mx + 55, c3 = mx + 100, c4 = mx + 148
  pf('Patient:', String(patient.name || '-'), c1, py1)
  pf('MR #:', String(patient.mrn || '-'), c2, py1)
  pf('Age:', String(patient.age || '-'), c3, py1)
  pf('Gender:', String(patient.gender || '-'), c4, py1)
  pf('Token:', String(data.tokenNo || (data as any).tokenNo || '-'), c1, py2)
  pf('Phone:', String(patient.phone || '-'), c2, py2)
  pf('Date:', dt.toLocaleDateString('en-GB'), c3, py2)

  let y = patY + patH + 1.5

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TWO-COLUMN BODY: Compact Vitals+Tests LEFT | Clinical Notes + Rx RIGHT
  // ══════════════════════════════════════════════════════════════════════════
  const lw = 28        // left panel width (narrower)
  const gap = 3
  const rx = mx + lw + gap
  const rw = cw - lw - gap
  const bodyY = y

  // ── LEFT: Vitals ─────────────────────────────────────────────────────────
  const v = data.vitals || {}
  const vitals = [
    { l: 'BP',    v: v.bloodPressureSys != null && v.bloodPressureDia != null ? `${v.bloodPressureSys}/${v.bloodPressureDia}` : '' },
    { l: 'P',     v: v.pulse != null ? String(v.pulse) : '' },
    { l: 'T',     v: v.temperatureC != null ? `${v.temperatureC}°C` : '' },
    { l: 'RR',    v: v.respiratoryRate != null ? String(v.respiratoryRate) : '' },
    { l: 'SpO2',  v: v.spo2 != null ? `${v.spo2}%` : '' },
    { l: 'BS',    v: v.bloodSugar != null ? String(v.bloodSugar) : '' },
    { l: 'Wt',    v: v.weightKg != null ? `${v.weightKg}kg` : '' },
    { l: 'Ht',    v: v.heightCm != null ? `${v.heightCm}cm` : '' },
    { l: 'BMI',   v: v.bmi != null ? String(v.bmi) : '' },
    { l: 'AR',    v: String((v as any).ar || '') },
    { l: 'VA',    v: String((v as any).va || '') },
    { l: 'IOP',   v: String((v as any).iop || '') },
  ].filter(x => x.v.trim())

  const vitH = Math.max(18, 7 + vitals.length * 3.5)

  // Vitals box — no heavy fill, just border
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(mx, bodyY, lw, vitH, 1.5, 1.5, 'D')

  // Vitals header — text only, no fill
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5)
  pdf.setTextColor(teal.r, teal.g, teal.b)
  pdf.text('VITALS', mx + 2, bodyY + 4.5)

  pdf.setDrawColor(tealLt.r, tealLt.g, tealLt.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx + 2, bodyY + 5.5, mx + 18, bodyY + 5.5)

  let vitY = bodyY + 8
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5)
  pdf.setTextColor(navy.r, navy.g, navy.b)
  for (const vit of vitals) {
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(`${vit.l}:`, mx + 2, vitY)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(vit.v, mx + 12, vitY)
    vitY += 3.5
  }

  // ── LEFT: Tests (below vitals) ───────────────────────────────────────────
  const labTests  = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  let leftBottom = bodyY + vitH

  if (labTests.length || diagTests.length) {
    const tsY = leftBottom + 2
    const rows = labTests.length + diagTests.length
    const tsH = 7 + rows * 3.5 + 3
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.2)
    pdf.roundedRect(mx, tsY, lw, tsH, 1.5, 1.5, 'D')

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5)
    pdf.setTextColor(teal.r, teal.g, teal.b)
    pdf.text('TESTS', mx + 2, tsY + 4.5)

    pdf.setDrawColor(tealLt.r, tealLt.g, tealLt.b)
    pdf.setLineWidth(0.2)
    pdf.line(mx + 2, tsY + 5.5, mx + 18, tsY + 5.5)

    let ty = tsY + 8
    for (const t of [...labTests, ...diagTests]) {
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.setFontSize(6.5)
      const ls = (pdf as any).splitTextToSize(`• ${t}`, lw - 5)
      pdf.text(ls, mx + 2, ty); ty += ls.length * 3.2
    }
    leftBottom = tsY + tsH
  }

  // ── RIGHT: Clinical Notes ─────────────────────────────────────────────────
  let ry = bodyY
  const sect = (title: string, val: string | undefined) => {
    if (!val?.trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(title.toUpperCase(), rx, ry)
    ry += 0.5
    pdf.setDrawColor(tealLt.r, tealLt.g, tealLt.b)
    pdf.setLineWidth(0.2); pdf.line(rx, ry + 1, rx + rw, ry + 1)
    ry += 2.5
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(navy.r, navy.g, navy.b)
    const lines = (pdf as any).splitTextToSize(val.trim(), rw)
    pdf.text(lines, rx, ry)
    ry += lines.length * 3.5 + 2
  }
  sect('Chief Complaint', data.primaryComplaint)
  sect('Diagnosis', data.diagnosis)
  sect('History', data.history)
  sect('Exam Findings', data.examFindings)
  sect('Allergies', data.allergyHistory)
  sect('Family History', data.familyHistory)
  sect('Advice', data.advice)
  sect('Follow Up', data.nextFollowUp)

  // ── Rx Medicines Table ────────────────────────────────────────────────────
  const wantsUrdu = data.language === 'urdu'
  let urduFontOk = false
  let drawUrduText: any = null
  if (wantsUrdu) {
    try {
      const mod = await import('../ensureUrduNastaleeq')
      urduFontOk = await mod.ensureUrduNastaleeq(pdf)
      drawUrduText = mod.drawUrduText
    } catch { urduFontOk = false }
  }
  const isUrdu = wantsUrdu && urduFontOk
  const { translateRxItem } = await import('../../prescriptionUrdu')
  const hasUrduChars = (s: string) => urduFontOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    if (drawUrduText) drawUrduText(pdf, text, x, y, opts)
    else pdf.text(text, x, y, opts)
  }

  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y = Math.max(ry, leftBottom) + 3

    // Rx Header — full width, light style
    pdf.setDrawColor(teal.r, teal.g, teal.b)
    pdf.setLineWidth(0.4)
    pdf.line(mx, y, mx + cw, y)

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
    pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    if (showRx('showRxSymbol')) {
      pdf.text('Rx', mx + 2, y + 5)
    }
    pdf.setFontSize(7.5)
    const headerText = isUrdu ? 'تجویز کردہ ادویات' : 'PRESCRIBED MEDICINES'
    if (hasUrduChars(headerText)) {
      safeUrduText(headerText, showRx('showRxSymbol') ? mx + 14 : mx + 3, y + 5)
    } else {
      pdf.setFont('helvetica', 'normal')
      pdf.text(headerText, showRx('showRxSymbol') ? mx + 14 : mx + 3, y + 5)
    }

    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.2)
    pdf.line(mx, y + 7, mx + cw, y + 7)
    y += 9

    // Wider columns for medicine table
    const cols = [5, 55, 18, 18, 20, 12, 20]
    const hdrs = isUrdu
      ? ['#', 'Medicine', 'خوراک', 'مدت', 'فریکوئنسی', 'طریقہ', 'ہدایت']
      : ['#', 'Medicine', 'Dose', 'Duration', 'Frequency', 'Route', 'Instr']

    // Header row with very light background
    pdf.setFillColor(tealLt.r, tealLt.g, tealLt.b)
    pdf.rect(mx, y - 3, cw, 5, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5)
    pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    let cx = mx + 2
    hdrs.forEach((h, i) => {
      if (hasUrduChars(h)) {
        safeUrduText(h, cx, y + 1)
      } else {
        pdf.setFont('helvetica', 'bold')
        pdf.text(h, cx, y + 1)
      }
      cx += cols[i]
    })
    y += 4.5

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(navy.r, navy.g, navy.b)
    meds.forEach((m, i) => {
      const t     = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const generic = String(m?.genericName || '').trim()
      const company = String(m?.company || '').trim()
      const dose  = String(t?.dose || '').trim()
      const dur   = String(t?.duration || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const route = String(t?.route || '').trim()
      const instr = String(t?.instruction || '').trim()
      const nameL = (pdf as any).splitTextToSize(name, cols[1] - 4)
      const detailParts = [generic, company].filter(Boolean)
      const detailLine = detailParts.join(' · ')
      const detailL = detailLine ? (pdf as any).splitTextToSize(detailLine, cols[1] - 4) : []
      const rowH  = (nameL.length + detailL.length) * 3.4 + 1.5

      // Very subtle alternate row
      if (i % 2 === 0) {
        pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b)
        pdf.rect(mx, y - 2.5, cw, rowH + 0.5, 'F')
      }

      cx = mx + 2
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(teal.r, teal.g, teal.b)
      pdf.setFontSize(7)
      pdf.text(String(i + 1), cx, y); cx += cols[0]

      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.setFontSize(7.5)
      pdf.text(nameL, cx, y)
      if (detailL.length) {
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(gray.r, gray.g, gray.b)
        pdf.setFontSize(6)
        pdf.text(detailL, cx, y + nameL.length * 3.2)
        pdf.setTextColor(navy.r, navy.g, navy.b)
      }
      cx += cols[1]

      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.setFontSize(7)
      if (hasUrduChars(dose)) safeUrduText(dose, cx + cols[2] - 1, y, { align: 'right', maxWidth: cols[2] - 2 })
      else { pdf.text(dose, cx, y) }
      cx += cols[2]

      if (hasUrduChars(dur)) safeUrduText(dur, cx + cols[3] - 1, y, { align: 'right', maxWidth: cols[3] - 2 })
      else { pdf.text(dur, cx, y) }
      cx += cols[3]

      if (hasUrduChars(freq)) safeUrduText(freq, cx + cols[4] - 1, y, { align: 'right', maxWidth: cols[4] - 2 })
      else { pdf.text(freq, cx, y) }
      cx += cols[4]

      if (hasUrduChars(route)) safeUrduText(route, cx + cols[5] - 1, y, { align: 'right', maxWidth: cols[5] - 2 })
      else { pdf.text(route, cx, y) }
      cx += cols[5]

      pdf.setFontSize(6.5); pdf.setTextColor(gray.r, gray.g, gray.b)
      if (hasUrduChars(instr)) safeUrduText(instr, cx + cols[6] - 1, y, { align: 'right', maxWidth: cols[6] - 2 })
      else if (instr) { pdf.setFont('helvetica', 'normal'); pdf.text(instr, cx, y) }
      pdf.setFontSize(7.5)

      // Very light bottom rule per row
      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.1)
      pdf.line(mx + 2, y + rowH - 1.5, mx + cw - 2, y + rowH - 1.5)

      y += rowH
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. FOOTER — minimal professional
  // ══════════════════════════════════════════════════════════════════════════
  const footY = H - 16

  // Signature
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, footY, mx + 35, footY)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text('Signature', mx, footY + 3)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, mx, footY + 6.5)

  // Footer info line
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, H - 9, W - mx, H - 9)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`${String(settings.name || '')}  ·  ${String(settings.phone || '')}  ·  ${String(settings.address || '')}`, W / 2, H - 5.5, { align: 'center' })

  const { applyOverlayBeforeOutput } = await import('./applyOverlay')
  await applyOverlayBeforeOutput(pdf)

  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      await api.printPreviewPdf(pdf.output('datauristring') as string)
      return
    }
  } catch {}
  window.open(URL.createObjectURL(pdf.output('blob') as Blob), '_blank')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function roundedRect(pdf: any, x: number, y: number, w: number, h: number, r: number) {
  try { pdf.roundedRect(x, y, w, h, r, r) } catch { pdf.rect(x, y, w, h) }
}
void roundedRect

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 200; c.height = img.naturalHeight || 200; c.getContext('2d')?.drawImage(img, 0, 0); resolve(c.toDataURL('image/png') || src) } catch { resolve(src) } }
      img.onerror = () => resolve(src); img.src = src
    })
  } catch { return src }
}
