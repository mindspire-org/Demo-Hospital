import { translateRxItem } from '../../prescriptionUrdu'
import { ensurePoppins } from '../ensurePoppins'

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
  vitals?: { pulse?: number; temperatureC?: number; temperatureF?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number; ar?: string; va?: string; iop?: string }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
  language?: 'english' | 'urdu'
}

const C = {
  indigo:   { r: 79,  g: 70,  b: 229 },
  indigoLt: { r: 224, g: 231, b: 255 },
  slate:    { r: 15,  g: 23,  b: 42  },
  slateMd:  { r: 71,  g: 85,  b: 105 },
  slateLt:  { r: 148, g: 163, b: 184 },
  rose:     { r: 244, g: 63,  b: 94  },
  white:    { r: 255, g: 255, b: 255 },
  faint:    { r: 248, g: 250, b: 252 },
  border:   { r: 226, g: 232, b: 240 },
  rowAlt:   { r: 241, g: 245, b: 249 },
}

function parseDurationToDays(durationText: string): number {
  if (!durationText) return 0
  const s = durationText.toLowerCase().trim()
  const numMatch = s.match(/(\d+(?:\.\d+)?)/)
  const num = numMatch ? parseFloat(numMatch[1]) : 0
  if (!num) return 0
  if (s.includes('month') || s.includes('مہینہ') || s.includes('مہینے')) return Math.round(num * 30)
  if (s.includes('week') || s.includes('ہفتہ') || s.includes('ہفتے')) return Math.round(num * 7)
  if (s.includes('year') || s.includes('سال')) return Math.round(num * 365)
  return Math.round(num)
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function computeDateRange(startDate: Date, durationText: string): string {
  const days = parseDurationToDays(durationText)
  if (!days) return ''
  const end = new Date(startDate)
  end.setDate(end.getDate() + days)
  return `${formatDateShort(startDate)} – ${formatDateShort(end)}`
}

function setFont(pdf: any, face: string, style: string) {
  try { pdf.setFont(face, style) } catch { pdf.setFont('helvetica', style) }
}

export async function previewBilingualRxPdf(data: PrescriptionPdfData) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 12
  const cw = W - 2 * mx

  let urduFontOk = false
  let drawUrduText: any = null
  try {
    const mod = await import('../ensureUrduNastaleeq')
    urduFontOk = await mod.ensureUrduNastaleeq(pdf)
    drawUrduText = mod.drawUrduText
  } catch { urduFontOk = false }
  const hasUrduChars = (s: string) => urduFontOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    if (drawUrduText) drawUrduText(pdf, text, x, y, opts)
    else pdf.text(text, x, y, opts)
  }

  // ── Top accent bar ──
  pdf.setFillColor(C.indigo.r, C.indigo.g, C.indigo.b)
  pdf.rect(0, 0, W, 2.2, 'F')

  // ══════════════════════════════════════════════════════════════════════════
  // 2. HEADER — clean, spacious, modern
  // ══════════════════════════════════════════════════════════════════════════
  let y = 7
  let logoEndX = mx
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePngDataUrl(logoSrc)
      pdf.addImage(norm, 'PNG' as any, mx, y, 13, 13, undefined, 'FAST')
      logoEndX = mx + 17
    } catch {}
  }

  setFont(pdf, 'Poppins', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
  pdf.text(String(settings.name || ''), logoEndX, y + 6)

  setFont(pdf, 'Poppins', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(C.slateLt.r, C.slateLt.g, C.slateLt.b)
  const hosMeta = [settings.address, settings.phone].filter(Boolean).join('  ·  ')
  if (hosMeta) pdf.text(hosMeta, logoEndX, y + 11.5)

  // Doctor card — right side, eye-catching
  const drCardW = 72
  const drCardH = 18
  const drCardX = W - mx - drCardW
  const drCardY = y - 1

  pdf.setFillColor(C.indigoLt.r, C.indigoLt.g, C.indigoLt.b)
  pdf.roundedRect(drCardX, drCardY, drCardW, drCardH, 4, 4, 'F')
  pdf.setDrawColor(C.indigo.r, C.indigo.g, C.indigo.b)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(drCardX, drCardY, drCardW, drCardH, 4, 4, 'S')

  const drName = `Dr. ${String(doctor.name || '')}`
  setFont(pdf, 'Poppins', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(C.indigo.r, C.indigo.g, C.indigo.b)
  pdf.text(drName, drCardX + drCardW - 4, drCardY + 6.5, { align: 'right' })

  setFont(pdf, 'Poppins', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(C.slateMd.r, C.slateMd.g, C.slateMd.b)
  const drMeta = [doctor.qualification, doctor.specialization, doctor.departmentName].filter(Boolean).join('  ·  ')
  if (drMeta) pdf.text(drMeta, drCardX + drCardW - 4, drCardY + 11, { align: 'right' })
  if (doctor.phone) {
    pdf.setFontSize(7)
    pdf.text(`Phone: ${doctor.phone}`, drCardX + drCardW - 4, drCardY + 15, { align: 'right' })
  }

  y = Math.max(y + 16, drCardY + drCardH + 3)

  // ══════════════════════════════════════════════════════════════════════════
  // 3. PATIENT STRIP — modern card
  // ══════════════════════════════════════════════════════════════════════════
  pdf.setFillColor(C.faint.r, C.faint.g, C.faint.b)
  pdf.roundedRect(mx, y, cw, 14, 3, 3, 'F')
  pdf.setDrawColor(C.border.r, C.border.g, C.border.b)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(mx, y, cw, 14, 3, 3, 'S')

  setFont(pdf, 'Poppins', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
  pdf.text(String(patient.name || '—'), mx + 5, y + 5.5)

  setFont(pdf, 'Poppins', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(C.slateMd.r, C.slateMd.g, C.slateMd.b)
  const patMeta = [
    patient.mrn ? `MR # ${patient.mrn}` : null,
    patient.age ? `Age: ${patient.age}` : null,
    patient.gender ? `Gender: ${patient.gender}` : null,
    patient.fatherName ? `Father: ${patient.fatherName}` : null,
    patient.phone ? `Phone: ${patient.phone}` : null,
    `Date: ${dt.toLocaleDateString('en-GB')}`,
  ].filter(Boolean).join('    |    ')
  pdf.text(patMeta, mx + 5, y + 10.5)

  y += 18

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TWO-COLUMN INFO
  // ══════════════════════════════════════════════════════════════════════════
  const colW = cw / 2 - 3
  let leftY = y
  let rightY = y

  function sectionHeader(label: string, yPos: number, isRight = false) {
    const x = isRight ? mx + cw / 2 + 3 : mx
    setFont(pdf, 'Poppins', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(C.indigo.r, C.indigo.g, C.indigo.b)
    pdf.text(label, x, yPos)
    pdf.setDrawColor(C.indigo.r, C.indigo.g, C.indigo.b)
    pdf.setLineWidth(0.4)
    pdf.line(x, yPos + 1.8, x + 18, yPos + 1.8)
    setFont(pdf, 'Poppins', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
    return yPos + 4.5
  }

  function block(label: string, value: string, yPos: number, isRight = false): number {
    if (!value) return yPos
    const x = isRight ? mx + cw / 2 + 3 : mx
    let ny = sectionHeader(label, yPos, isRight)
    const lines = (pdf as any).splitTextToSize(String(value), colW - 4)
    pdf.text(lines, x, ny)
    return ny + lines.length * 3.6 + 2.5
  }

  leftY = block('Chief Complaint', String(data.primaryComplaint || data.history || ''), leftY)
  leftY = block('Diagnosis', String(data.diagnosis || ''), leftY)
  if (data.examFindings) leftY = block('Examination Findings', String(data.examFindings), leftY)

  const v = data.vitals || {}
  const vitalsArr: string[] = []
  if (v.pulse != null) vitalsArr.push(`Pulse: ${v.pulse}`)
  if (v.temperatureC != null) vitalsArr.push(`Temp: ${v.temperatureC}°C`)
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsArr.push(`BP: ${v.bloodPressureSys}/${v.bloodPressureDia}`)
  if (v.respiratoryRate != null) vitalsArr.push(`RR: ${v.respiratoryRate}`)
  if (v.spo2 != null) vitalsArr.push(`SpO₂: ${v.spo2}%`)
  if (v.weightKg != null) vitalsArr.push(`Weight: ${v.weightKg}kg`)
  if (v.bloodSugar != null) vitalsArr.push(`BS: ${v.bloodSugar}`)
  if (vitalsArr.length) leftY = block('Vitals', vitalsArr.join('    |    '), leftY)

  if (data.labTests?.length) leftY = block('Lab Tests', data.labTests.join(', '), leftY)
  if (data.diagnosticTests?.length) leftY = block('Diagnostic Tests', data.diagnosticTests.join(', '), leftY)

  rightY = block('Advice / Follow Up', String(data.advice || '') + (data.nextFollowUp ? `\nNext Follow-up: ${data.nextFollowUp}` : ''), rightY, true)

  const ry = Math.max(leftY, rightY)

  // ══════════════════════════════════════════════════════════════════════════
  // 5. MEDICINES — Bilingual, larger & readable
  // ══════════════════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y = ry + 4

    // Rx header bar
    pdf.setFillColor(C.indigoLt.r, C.indigoLt.g, C.indigoLt.b)
    pdf.roundedRect(mx, y, cw, 10, 3, 3, 'F')
    setFont(pdf, 'Poppins', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(C.rose.r, C.rose.g, C.rose.b)
    pdf.text('Rx', mx + 5, y + 6.5)
    setFont(pdf, 'Poppins', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
    pdf.text('PRESCRIBED MEDICINES', mx + 14, y + 6.5)
    setFont(pdf, 'Poppins', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(C.slateLt.r, C.slateLt.g, C.slateLt.b)
    pdf.text('/  تجویز کردہ ادویات', mx + 55, y + 6.5)
    y += 13

    // Column headers
    const enColX = mx + 12
    const enColW = cw * 0.48
    const urduRightX = W - mx - 5
    const urduColW = cw * 0.28

    setFont(pdf, 'Poppins', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(C.slateLt.r, C.slateLt.g, C.slateLt.b)
    pdf.text('#', mx + 4, y)
    pdf.text('Medicine & Instructions', enColX, y)
    pdf.text('Urdu / ہدایات', urduRightX, y, { align: 'right' })
    pdf.setDrawColor(C.border.r, C.border.g, C.border.b)
    pdf.setLineWidth(0.25)
    pdf.line(mx, y + 1.5, mx + cw, y + 1.5)
    y += 5

    meds.forEach((m, i) => {
      const urduItem = translateRxItem(m as any, 'urdu')
      const enItem = m
      const name = String(enItem?.name || '').trim()
      const generic = String(enItem?.genericName || '').trim()
      const dose = String(enItem?.dose || '').trim()
      const freq = String(enItem?.frequency || '').trim()
      const dur = String(enItem?.duration || '').trim()
      const route = String(enItem?.route || '').trim()
      const instr = String(enItem?.instruction || '').trim()
      const urduInstr = String(urduItem.instruction || '').trim()
      const urduFreq = String(urduItem.frequency || '').trim()
      const urduDur = String(urduItem.duration || '').trim()

      const dateRange = computeDateRange(dt, dur)
      const detailParts = [generic, dose].filter(Boolean)
      const detailLine = detailParts.join(' · ')

      const enLineParts = [name]
      if (detailLine) enLineParts.push(`(${detailLine})`)
      if (route) enLineParts.push(route)
      if (freq) enLineParts.push(`for ${dur} ${freq}`)
      if (instr) enLineParts.push(`[${instr}]`)
      if (dateRange) enLineParts.push(`(${dateRange})`)
      const enLine = enLineParts.join(' ')

      const urduLineParts: string[] = []
      if (urduFreq) urduLineParts.push(urduFreq)
      if (urduDur) urduLineParts.push(urduDur)
      if (urduInstr) urduLineParts.push(urduInstr)
      const urduLine = urduLineParts.join(' · ')

      const enLines = (pdf as any).splitTextToSize(enLine, enColW)
      const urduLines = urduLine ? (pdf as any).splitTextToSize(urduLine, urduColW) : []
      const rowH = Math.max(enLines.length, urduLines.length, 1) * 4.5 + 3.5

      if (i % 2 === 0) {
        pdf.setFillColor(C.rowAlt.r, C.rowAlt.g, C.rowAlt.b)
        pdf.roundedRect(mx + 1, y - 2, cw - 2, rowH, 2, 2, 'F')
      }

      // Number badge
      pdf.setFillColor(C.indigo.r, C.indigo.g, C.indigo.b)
      const badgeR = 2.4
      pdf.circle(mx + 5, y + 1.5, badgeR, 'F')
      setFont(pdf, 'Poppins', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(C.white.r, C.white.g, C.white.b)
      pdf.text(String(i + 1), mx + 5, y + 2.5, { align: 'center' })

      // English text (left column, fixed width)
      setFont(pdf, 'Poppins', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
      pdf.text(enLines, enColX, y + 2)

      // Urdu text (right column, right-aligned, fixed width)
      if (urduLine) {
        setFont(pdf, 'Poppins', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(C.slateMd.r, C.slateMd.g, C.slateMd.b)
        if (hasUrduChars(urduLine)) {
          safeUrduText(urduLine, urduRightX, y + 2, { align: 'right', maxWidth: urduColW })
        } else {
          pdf.text(urduLines, urduRightX, y + 2, { align: 'right' })
        }
      }

      y += rowH
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. FOOTER — minimal modern
  // ══════════════════════════════════════════════════════════════════════════
  const footY = H - 14
  pdf.setDrawColor(C.border.r, C.border.g, C.border.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, footY, W - mx, footY)

  setFont(pdf, 'Poppins', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(C.slateLt.r, C.slateLt.g, C.slateLt.b)
  pdf.text('Signature', mx, footY + 3.5)

  setFont(pdf, 'Poppins', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(C.slate.r, C.slate.g, C.slate.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, mx, footY + 7.5)

  setFont(pdf, 'Poppins', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(C.slateLt.r, C.slateLt.g, C.slateLt.b)
  pdf.text(`${String(settings.name || '')}  ·  ${String(settings.phone || '')}  ·  ${String(settings.address || '')}`, W / 2, H - 4.5, { align: 'center' })

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
