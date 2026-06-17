import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq, drawUrduText } from '../ensureUrduNastaleeq'

export type SpecialistClinicPdfData = {
  doctor?: {
    name?: string
    qualification?: string
    departmentName?: string
    phone?: string
    title?: string
    specialization?: string
  }
  settings?: {
    name?: string
    address?: string
    phone?: string
    logoDataUrl?: string
  }
  patient?: {
    name?: string
    mrn?: string
    gender?: string
    fatherName?: string
    age?: string
    phone?: string
    address?: string
    cnic?: string
  }
  items?: Array<{
    name?: string
    frequency?: string
    duration?: string
    dose?: string
    instruction?: string
    route?: string
    notes?: string
    qty?: number | string
  }>
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
  riskFactors?: string
  medicalHistory?: string
  historyOfComplaint?: string
  examinationFindings?: string
  referral?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    temperatureF?: number
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

export async function previewSpecialistClinicPdf(data: SpecialistClinicPdfData) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  try { await ensurePoppins(pdf) } catch {}
  const urduOk = await ensureUrduNastaleeq(pdf)
  const hasUrdu = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    if (drawUrduText) drawUrduText(pdf, text, x, y, opts)
    else pdf.text(text, x, y, opts)
  }
  const wantsUrdu = (data as any).language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  // ── PALETTE: Specialist — dark sidebar + clean white main ────────────────
  const sidebar  = { r: 22,  g: 36,  b: 71  }   // deep navy
  const sideAcct = { r: 14,  g: 24,  b: 50  }   // darker shade for stripes
  const amber    = { r: 245, g: 158, b: 11  }   // amber-400 accent
  const amberLt  = { r: 254, g: 243, b: 199 }
  const ink      = { r: 17,  g: 24,  b: 39  }   // gray-900
  const mid      = { r: 75,  g: 85,  b: 99  }   // gray-600
  const border   = { r: 209, g: 213, b: 219 }
  const white    = { r: 255, g: 255, b: 255 }
  const offWhite = { r: 249, g: 250, b: 251 }
  const ghost    = { r: 170, g: 180, b: 205 }   // muted on dark bg

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()

  // Layout: sidebar (left 56mm) + main (right rest)
  const sw  = 56          // sidebar width
  const mx  = sw + 8      // main content x start
  const mw  = W - mx - 8  // main content width

  // ══════════════════════════════════════════════════════════════════════════
  // 1. DARK SIDEBAR — full page height
  // ══════════════════════════════════════════════════════════════════════════
  pdf.setFillColor(sidebar.r, sidebar.g, sidebar.b)
  pdf.rect(0, 0, sw, H, 'F')

  // Subtle diagonal stripe texture
  pdf.setFillColor(sideAcct.r, sideAcct.g, sideAcct.b)
  for (let i = 0; i < H + sw; i += 12) {
    pdf.rect(0, i, sw, 2, 'F')
  }
  // Re-cover to blend
  pdf.setFillColor(sidebar.r, sidebar.g, sidebar.b)
  pdf.setDrawColor(sidebar.r, sidebar.g, sidebar.b)
  for (let i = 2; i < H + sw; i += 12) {
    pdf.rect(0, i, sw, 10, 'F')
  }

  // Amber vertical accent strip (inner right edge of sidebar)
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(sw - 2, 0, 2, H, 'F')

  // ── Sidebar: Logo ─────────────────────────────────────────────────────────
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePng(logoSrc)
      pdf.addImage(norm, 'PNG' as any, (sw - 20) / 2, 8, 20, 20, undefined, 'FAST')
    } catch {}
  }

  // ── Sidebar: Doctor block ─────────────────────────────────────────────────
  const sX = sw / 2   // center X
  let sY = logoSrc ? 35 : 14

  // Amber divider line
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(6, sY, sw - 14, 0.8, 'F')
  sY += 4

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12.5)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, sX, sY, { align: 'center' })
  sY += 5.5

  if (doctor.qualification) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
    pdf.setTextColor(ghost.r, ghost.g, ghost.b)
    const qLines = (pdf as any).splitTextToSize(String(doctor.qualification), sw - 10)
    pdf.text(qLines, sX, sY, { align: 'center' })
    sY += qLines.length * 4
  }
  const spec = String(doctor.specialization || doctor.departmentName || '')
  if (spec) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
    pdf.setTextColor(amber.r, amber.g, amber.b)
    const spLines = (pdf as any).splitTextToSize(spec, sw - 10)
    pdf.text(spLines, sX, sY + 1, { align: 'center' })
    sY += spLines.length * 4.5 + 1
  }

  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(6, sY + 1, sw - 14, 0.8, 'F')
  sY += 6

  // ── Sidebar: Vitals ───────────────────────────────────────────────────────
  const v = data.vitals || {}
  const vitals = [
    { l: 'BP',    v: v.bloodPressureSys != null && v.bloodPressureDia != null ? `${v.bloodPressureSys}/${v.bloodPressureDia}` : '' },
    { l: 'Pulse', v: v.pulse != null ? `${v.pulse} bpm` : '' },
    { l: 'Temp',  v: v.temperatureC != null ? `${v.temperatureC} °C` : '' },
    { l: 'RR',    v: v.respiratoryRate != null ? `${v.respiratoryRate}/min` : '' },
    { l: 'SpO2',  v: v.spo2 != null ? `${v.spo2}%` : '' },
    { l: 'Sugar', v: v.bloodSugar != null ? `${v.bloodSugar}` : '' },
    { l: 'Wt',    v: v.weightKg != null ? `${v.weightKg}kg` : '' },
    { l: 'Ht',    v: v.heightCm != null ? `${v.heightCm}cm` : '' },
    { l: 'BMI',   v: v.bmi != null ? String(v.bmi) : '' },
    { l: 'AR',    v: String((v as any).ar || '') },
    { l: 'VA',    v: String((v as any).va || '') },
    { l: 'IOP',   v: String((v as any).iop || '') },
  ].filter(x => x.v.trim())

  if (vitals.length) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5)
    pdf.setTextColor(ghost.r, ghost.g, ghost.b)
    pdf.text('VITALS', sX, sY, { align: 'center' })
    sY += 4
    for (const vit of vitals) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5)
      pdf.setTextColor(ghost.r, ghost.g, ghost.b)
      pdf.text(`${vit.l}:`, 4, sY)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(white.r, white.g, white.b)
      pdf.text(vit.v, sw - 4, sY, { align: 'right' })
      sY += 4
    }
    sY += 2
  }

  // ── Sidebar: Investigations ────────────────────────────────────────────────
  const labTests  = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    pdf.setFillColor(amber.r, amber.g, amber.b)
    pdf.rect(6, sY, sw - 14, 0.6, 'F')
    sY += 4
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5)
    pdf.setTextColor(ghost.r, ghost.g, ghost.b)
    pdf.text('INVESTIGATIONS', sX, sY, { align: 'center' })
    sY += 4
    for (const t of [...labTests, ...diagTests]) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
      pdf.setTextColor(white.r, white.g, white.b)
      const ls = (pdf as any).splitTextToSize(`• ${t}`, sw - 8)
      pdf.text(ls, 4, sY); sY += ls.length * 3.8
    }
  }

  // ── Sidebar: Footer contact ───────────────────────────────────────────────
  const sFootY = H - 22
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(6, sFootY, sw - 14, 0.6, 'F')
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5)
  pdf.setTextColor(ghost.r, ghost.g, ghost.b)
  if (settings.phone) { pdf.text(String(settings.phone), sX, sFootY + 5, { align: 'center' }) }
  if (settings.address) {
    const al = (pdf as any).splitTextToSize(String(settings.address), sw - 8)
    pdf.text(al, sX, sFootY + 10, { align: 'center' })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. MAIN CONTENT AREA
  // ══════════════════════════════════════════════════════════════════════════

  // Main background
  pdf.setFillColor(white.r, white.g, white.b)
  pdf.rect(sw, 0, W - sw, H, 'F')

  // ── Hospital name + date (top of main) ────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
  pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(String(settings.name || 'Hospital'), mx, 13)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(mid.r, mid.g, mid.b)
  if (settings.address) pdf.text(String(settings.address), mx, 18.5)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text(dt.toLocaleDateString('en-GB'), W - 8, 13, { align: 'right' })

  // Amber rule under clinic name
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(mx, 21, mw, 1, 'F')

  // ── Patient band ─────────────────────────────────────────────────────────
  let y = 26
  pdf.setFillColor(offWhite.r, offWhite.g, offWhite.b)
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.25)
  pdf.roundedRect(mx, y, mw, 15, 2, 2, 'FD')

  // Left accent
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.roundedRect(mx, y, 2, 15, 1, 1, 'F')

  const kv = (l: string, val2: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(l, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text(String(val2 || '-'), x, yy + 4.5)
  }
  const c1 = mx + 5, c2 = mx + 52, c3 = mx + 94, c4 = mx + 134
  kv('PATIENT NAME', String(patient.name || '-'), c1, y + 4)
  kv('MR NUMBER', String(patient.mrn || '-'), c2, y + 4)
  kv('AGE / GENDER', `${patient.age || '-'} / ${patient.gender || '-'}`, c3, y + 4)
  kv('DATE', dt.toLocaleDateString('en-GB'), c4, y + 4)

  y += 20

  // ── Clinical sections ─────────────────────────────────────────────────────
  const sect = (title: string, val2: string | undefined) => {
    if (!val2?.trim()) return
    // Amber left rule
    pdf.setFillColor(amber.r, amber.g, amber.b)
    pdf.rect(mx, y, 2, 6, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text(title, mx + 5, y + 4.5)
    y += 7
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(mid.r, mid.g, mid.b)
    const lines = (pdf as any).splitTextToSize(val2.trim(), mw - 4)
    pdf.text(lines, mx + 5, y)
    y += lines.length * 4.2 + 3
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.15); pdf.line(mx, y, mx + mw, y)
    y += 2
  }

  sect('Chief Complaint', data.primaryComplaint)
  sect('Diagnosis / Disease', data.diagnosis)
  sect('Medical History', data.riskFactors || data.medicalHistory || data.history)
  sect('Examination Findings', data.examinationFindings || data.examFindings)
  sect('Family History', data.familyHistory)
  sect('Allergy History', data.allergyHistory)
  sect('Advice / Referral', data.advice || data.referral)
  sect('Next Follow Up', data.nextFollowUp)

  // ── Rx Medicines ──────────────────────────────────────────────────────────
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y += 3
    // Section bar
    pdf.setFillColor(sidebar.r, sidebar.g, sidebar.b)
    pdf.rect(mx, y, mw, 7, 'F')
    pdf.setFillColor(amber.r, amber.g, amber.b)
    pdf.rect(mx, y, 3, 7, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(white.r, white.g, white.b)
    pdf.text('Rx', mx + 6, y + 5.5)
    pdf.setFontSize(8)
    pdf.text('SPECIALIST PRESCRIPTION', mx + 17, y + 5.5)
    y += 10

    // Col widths
    const cols = { num: 6, name: 48, dose: 20, freq: 28, dur: 20, route: mw - 6 - 48 - 20 - 28 - 20 }
    const { translateRxItem } = await import('../../prescriptionUrdu')
    const hdrs: [string, number][] = isUrdu
      ? [['#', cols.num], ['Medicine', cols.name], ['خوراک', cols.dose], ['فریکوئنسی', cols.freq], ['مدت', cols.dur], ['طریقہ / ہدایت', cols.route]]
      : [['#', cols.num], ['Medicine', cols.name], ['Dose', cols.dose], ['Frequency', cols.freq], ['Duration', cols.dur], ['Route / Instr.', cols.route]]

    // Header row
    pdf.setFillColor(amberLt.r, amberLt.g, amberLt.b)
    pdf.rect(mx, y - 3, mw, 5.5, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(ink.r, ink.g, ink.b)
    let cx = mx + 1
    hdrs.forEach(([h, w]) => {
      if (hasUrdu(h)) { safeUrduText(h, cx, y + 1) } else { pdf.text(h, cx, y + 1) }
      cx += w
    })
    y += 5

    meds.forEach((m, i) => {
      const t = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const dose  = String(t?.dose || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const dur   = String(t?.duration || '').trim()
      const route = String(t?.route || '').trim()
      const instr = String(t?.instruction || '').trim()
      const nL    = (pdf as any).splitTextToSize(name, cols.name - 3)
      const routeInstr = [route, instr].filter(Boolean).join(' · ')
      const rL    = (pdf as any).splitTextToSize(routeInstr, cols.route - 3)
      const rowH  = Math.max(nL.length, rL.length) * 4.2 + 3

      if (i % 2 === 0) {
        pdf.setFillColor(249, 250, 251)
        pdf.rect(mx, y - 3, mw, rowH + 1, 'F')
      }

      cx = mx + 1
      // Number with amber circle
      pdf.setFillColor(amber.r, amber.g, amber.b)
      pdf.circle(cx + 2, y - 0.5, 2.2, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(white.r, white.g, white.b)
      pdf.text(String(i + 1), cx + 2, y + 0.8, { align: 'center' })
      cx += cols.num

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(ink.r, ink.g, ink.b)
      if (hasUrdu(name)) { safeUrduText(name, cx + cols.name - 1, y, { align: 'right', maxWidth: cols.name - 2 }) }
      else { pdf.text(nL, cx, y) }
      cx += cols.name
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(mid.r, mid.g, mid.b)
      if (hasUrdu(dose)) { safeUrduText(dose, cx + cols.dose - 1, y, { align: 'right', maxWidth: cols.dose - 2 }) }
      else { pdf.text(dose, cx, y) }
      cx += cols.dose
      if (hasUrdu(freq)) { safeUrduText(freq, cx + cols.freq - 1, y, { align: 'right', maxWidth: cols.freq - 2 }) }
      else { pdf.text(freq, cx, y) }
      cx += cols.freq
      if (hasUrdu(dur)) { safeUrduText(dur, cx + cols.dur - 1, y, { align: 'right', maxWidth: cols.dur - 2 }) }
      else { pdf.text(dur, cx, y) }
      cx += cols.dur
      if (hasUrdu(routeInstr)) { safeUrduText(routeInstr, cx + cols.route - 1, y, { align: 'right', maxWidth: cols.route - 2 }) }
      else { pdf.text(rL, cx, y) }

      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.15)
      pdf.line(mx, y + rowH - 2, mx + mw, y + rowH - 2)
      y += rowH
    })
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  const sigY = H - 20
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.3)
  pdf.line(W - 70, sigY, W - 8, sigY)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, W - 39, sigY + 5, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text('Signature / Stamp', W - 39, sigY + 9.5, { align: 'center' })

  // Bottom disclaimer
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(border.r, border.g, border.b)
  pdf.text('For pharmacy use only · Not valid for legal or court purposes', (mx + W) / 2, H - 4, { align: 'center' })

  const { applyOverlayBeforeOutput } = await import('./applyOverlay')
  await applyOverlayBeforeOutput(pdf)

  try {
    const api = (window as any).electronAPI
    if (api?.printPreviewPdf) { await api.printPreviewPdf(pdf.output('datauristring') as string); return }
  } catch {}
  window.open(URL.createObjectURL(pdf.output('blob') as Blob), '_blank')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function ensurePng(src: string): Promise<string> {
  if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
  return new Promise<string>(res => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 200; c.height = img.naturalHeight || 200; c.getContext('2d')?.drawImage(img, 0, 0); res(c.toDataURL('image/png') || src) } catch { res(src) } }
    img.onerror = () => res(src); img.src = src
  })
}

