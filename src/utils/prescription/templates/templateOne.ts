import jsPDF from 'jspdf'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq, drawUrduText } from '../ensureUrduNastaleeq'

export async function buildPrescriptionOne(data: PrescriptionPdfData) {
  // Guard against null/undefined data
  // Use safe reference for all data access
  const safeData: PrescriptionPdfData = data || {} as any

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  const urduOk = await ensureUrduNastaleeq(pdf)

  // ── PALETTE ────────────────────────────────────────────────────────────────
  const teal   = { r: 13,  g: 124, b: 102 }   // #0D7C66
  const tealBg = { r: 232, g: 246, b: 243 }   // teal tint
  const ink    = { r: 17,  g: 24,  b: 39  }   // #111827
  const muted  = { r: 107, g: 114, b: 128 }   // #6B7280
  const hair   = { r: 228, g: 231, b: 235 }   // #E4E7EB
  const rxRed  = { r: 201, g: 64,  b: 64  }   // #C94040
  const pageBg = { r: 246, g: 247, b: 249 }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const POP  = (w: 'normal'|'bold') => { try { pdf.setFont('Poppins', w) } catch { pdf.setFont('helvetica', w) } }
  const hasUrdu = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    drawUrduText(pdf, text, x, y, opts)
  }
  const safe = (v: any, fb = '—') => String(v || '').trim() || fb

  // ── PAGE BACKGROUND ────────────────────────────────────────────────────────
  pdf.setFillColor(pageBg.r, pageBg.g, pageBg.b)
  pdf.rect(0, 0, W, H, 'F')

  // ── WHITE CONTENT SHEET ───────────────────────────────────────────────────
  const mx = 11
  const my = 11
  const sw = W - mx * 2
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(mx, my, sw, H - my * 2, 3.5, 3.5, 'F')

  try {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — logo tile | clinic name+contact | doctor info
  // ══════════════════════════════════════════════════════════════════════════
  const hx = mx + 8
  let   hy = my + 9

  // Logo tile (teal rounded square with H+)
  const tileS = 16
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.roundedRect(hx, hy - 1, tileS, tileS, 2.5, 2.5, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(12)
  POP('bold')
  pdf.text('H+', hx + tileS / 2, hy + tileS / 2 + 2.5, { align: 'center' })

  // Clinic name + contact
  const nameX = hx + tileS + 5
  pdf.setTextColor(ink.r, ink.g, ink.b)
  POP('bold'); pdf.setFontSize(14)
  pdf.text(safe(safeData.settings?.name, 'Healthspire Clinic'), nameX, hy + 5)

  POP('normal'); pdf.setFontSize(7.5); pdf.setTextColor(muted.r, muted.g, muted.b)
  const contactParts = [safeData.settings?.address, safeData.settings?.phone].filter(Boolean).join('   ·   ')
  if (contactParts) pdf.text(contactParts, nameX, hy + 10)

  // Doctor block (right-aligned)
  const drX = W - mx - 8
  pdf.setTextColor(ink.r, ink.g, ink.b)
  POP('bold'); pdf.setFontSize(11)
  const drNameT1 = safe(safeData.doctor?.name, '—').replace(/^\s*Dr\.?\s*/i, '')
  pdf.text(`Dr. ${drNameT1}`, drX, hy + 4, { align: 'right' })
  POP('normal'); pdf.setFontSize(7.5); pdf.setTextColor(muted.r, muted.g, muted.b)
  pdf.text(safe(safeData.doctor?.qualification, ''), drX, hy + 9, { align: 'right' })
  const pmdc = safe((safeData.doctor as any)?.pmdc || (safeData.doctor as any)?.registrationNumber, '')
  if (pmdc) { pdf.setFontSize(7); pdf.text(`PMDC: ${pmdc}`, drX, hy + 13.5, { align: 'right' }) }
  const dept = safe(safeData.doctor?.departmentName || (safeData.settings as any)?.department, '')
  if (dept) { pdf.setTextColor(teal.r, teal.g, teal.b); pdf.setFontSize(7); pdf.text(dept.toUpperCase(), drX, hy + 18, { align: 'right' }) }

  // Teal divider line
  hy += tileS + 4
  pdf.setDrawColor(teal.r, teal.g, teal.b)
  pdf.setLineWidth(0.5)
  pdf.line(hx, hy, W - mx - 8, hy)

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PATIENT INFO — modern card with 2-row layout
  // ══════════════════════════════════════════════════════════════════════════
  hy += 4
  const piH = 22
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(hair.r, hair.g, hair.b)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(hx, hy, sw - 16, piH, 3, 3, 'FD')

  // Left teal accent bar
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.rect(hx, hy + 3, 3, piH - 6, 'F')

  const dt = safeData.createdAt ? new Date(safeData.createdAt as any) : new Date()
  const dateStr = (() => { try { return dt.toLocaleDateString('en-GB') } catch { return '' } })()

  const piRow = (lbl: string, val: string, x: number, yy: number) => {
    pdf.setTextColor(teal.r, teal.g, teal.b)
    POP('bold'); pdf.setFontSize(6.5)
    pdf.text(lbl, x, yy)
    pdf.setTextColor(ink.r, ink.g, ink.b)
    POP('normal'); pdf.setFontSize(8.5)
    pdf.text(safe(val), x, yy + 5)
  }

  const p1 = hx + 8, p2 = hx + 62, p3 = hx + 110, p4 = hx + 152
  piRow('PATIENT NAME', safe(safeData.patient?.name), p1, hy + 6)
  piRow('MR #', safe(safeData.patient?.mrn), p2, hy + 6)
  piRow('AGE / GENDER', `${safe(safeData.patient?.age)} / ${safe(safeData.patient?.gender)}`, p3, hy + 6)
  piRow('DATE', dateStr, p4, hy + 6)
  piRow('CONTACT', safe(safeData.patient?.phone), p1, hy + 14)
  piRow('TOKEN', safe((data as any).tokenNo, '—'), p2, hy + 14)

  // ══════════════════════════════════════════════════════════════════════════
  // 3. VITALS — clean row layout (no overlapping pills)
  // ══════════════════════════════════════════════════════════════════════════
  hy += piH + 6
  const vitals = [
    { label: 'BP',    val: (safeData.vitals?.bloodPressureSys && safeData.vitals?.bloodPressureDia) ? `${safeData.vitals.bloodPressureSys}/${safeData.vitals.bloodPressureDia}` : '' },
    { label: 'Pulse', val: safeData.vitals?.pulse ? `${safeData.vitals.pulse}` : '' },
    { label: 'Temp',  val: safeData.vitals?.temperatureC ? `${safeData.vitals.temperatureC}°C` : '' },
    { label: 'RR',    val: safeData.vitals?.respiratoryRate ? `${safeData.vitals.respiratoryRate}` : '' },
    { label: 'Wt',    val: safeData.vitals?.weightKg ? `${safeData.vitals.weightKg}kg` : '' },
    { label: 'SpO₂',  val: (safeData.vitals as any)?.spo2 ? `${(safeData.vitals as any).spo2}%` : '' },
  ].filter(v => v.val)

  if (vitals.length) {
    const vCardH = 14
    pdf.setFillColor(tealBg.r, tealBg.g, tealBg.b)
    pdf.roundedRect(hx, hy, sw - 16, vCardH, 2.5, 2.5, 'F')
    const vColW = (sw - 24) / vitals.length
    vitals.forEach((v, i) => {
      const cx = hx + 6 + i * vColW
      pdf.setTextColor(teal.r, teal.g, teal.b)
      POP('bold'); pdf.setFontSize(6)
      pdf.text(v.label, cx + vColW / 2, hy + 5, { align: 'center' })
      pdf.setTextColor(ink.r, ink.g, ink.b)
      POP('bold'); pdf.setFontSize(8.5)
      pdf.text(v.val, cx + vColW / 2, hy + 10, { align: 'center' })
    })
    hy += vCardH + 4
  } else {
    hy += 2
  }

  // Chief complaint
  const cc = safe(safeData.primaryComplaint || (safeData as any).chiefComplaint, '')
  if (cc) {
    POP('normal'); pdf.setFontSize(7.5); pdf.setTextColor(muted.r, muted.g, muted.b)
    pdf.text('Chief Complaint:', hx, hy + 3.5)
    pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal')
    pdf.text(cc, hx + 28, hy + 3.5)
    hy += 7
  }

  // Diagnosis
  const diag = safe(safeData.diagnosis || (safeData as any).provisionalDiagnosis, '')
  if (diag) {
    POP('normal'); pdf.setFontSize(7.5); pdf.setTextColor(muted.r, muted.g, muted.b)
    pdf.text('Diagnosis:', hx, hy + 3.5)
    pdf.setTextColor(ink.r, ink.g, ink.b); POP('bold')
    pdf.text(diag, hx + 20, hy + 3.5)
    hy += 7
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Rx SECTION
  // ══════════════════════════════════════════════════════════════════════════
  hy += 3
  // Teal hairline separator
  pdf.setDrawColor(hair.r, hair.g, hair.b)
  pdf.setLineWidth(0.2)
  pdf.line(hx, hy, W - mx - 8, hy)
  hy += 5

  // Large Rx mark (use helvetica bold for safety, colored for emphasis)
  pdf.setTextColor(rxRed.r, rxRed.g, rxRed.b)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('℞', hx, hy + 7)

  // PRESCRIPTION label
  pdf.setTextColor(ink.r, ink.g, ink.b)
  POP('bold'); pdf.setFontSize(9)
  pdf.text('PRESCRIPTION', hx + 10, hy + 5)
  pdf.setTextColor(muted.r, muted.g, muted.b)
  POP('normal'); pdf.setFontSize(7)
  pdf.text(dateStr, W - mx - 8, hy + 5, { align: 'right' })
  hy += 11

  // Modern medicine table with balanced columns
  const tableX  = hx
  const tableW  = sw - 16
  const cols    = [6, (tableW - 6) * 0.30, (tableW - 6) * 0.16, (tableW - 6) * 0.20, (tableW - 6) * 0.16, (tableW - 6) * 0.18]
  const cxPos = (idx: number) => {
    let px = tableX + 2
    for (let k = 0; k < idx; k++) px += cols[k]
    return px
  }
  const isU = (data as any).language === 'urdu'
  const headers = isU
    ? ['#', 'دوا', 'خوراک', 'فریکوئنسی', 'مدت', 'ہدایت']
    : ['#', 'MEDICINE', 'DOSE', 'FREQ', 'DURATION', 'INSTR']
  const rowH = 7.5

  // Header band — solid teal
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.roundedRect(tableX, hy, tableW, rowH, 1.5, 1.5, 'F')
  headers.forEach((h, hi) => {
    const center = cxPos(hi) + cols[hi] / 2
    pdf.setTextColor(255, 255, 255)
    POP('bold'); pdf.setFontSize(6.5)
    pdf.text(h, center, hy + 4.8, { align: 'center' })
  })
  hy += rowH

  // Medicine rows
  const meds = (safeData.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length === 0) {
    pdf.setDrawColor(hair.r, hair.g, hair.b)
    pdf.setLineWidth(0.2)
    pdf.line(tableX, hy + rowH, tableX + tableW, hy + rowH)
    hy += rowH + 4
  } else {
    const { translateRxItem } = await import('../../prescriptionUrdu')
    meds.forEach((m, idx) => {
      const t = translateRxItem(m as any, isU ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const dose  = String(t?.dose || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const dur   = String(t?.duration || '').trim()
      const instr = String(t?.instruction || '').trim()

      if (idx % 2 === 1) {
        pdf.setFillColor(250, 252, 251)
        pdf.rect(tableX, hy, tableW, rowH, 'F')
      }

      const colCenter = (cidx: number) => cxPos(cidx) + cols[cidx] / 2

      // Row number
      pdf.setTextColor(muted.r, muted.g, muted.b)
      POP('normal'); pdf.setFontSize(7)
      pdf.text(String(idx + 1), colCenter(0), hy + 5, { align: 'center' })

      // Medicine name
      const nameUrdu = hasUrdu(name)
      if (nameUrdu) {
        pdf.setFontSize(10)
        safeUrduText(name, cxPos(1) + cols[1] - 4, hy + 5.5, { align: 'right', maxWidth: cols[1] - 6 })
      } else {
        pdf.setTextColor(ink.r, ink.g, ink.b)
        POP('bold'); pdf.setFontSize(8.5)
        pdf.text(name, cxPos(1) + 3, hy + 5.5)
      }

      // Detail columns — center aligned
      if (hasUrdu(dose)) { pdf.setFontSize(9); safeUrduText(dose, colCenter(2), hy + 5.5, { align: 'center', maxWidth: cols[2] - 4 }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(dose, colCenter(2), hy + 5.5, { align: 'center' }) }

      if (hasUrdu(freq)) { pdf.setFontSize(9); safeUrduText(freq, colCenter(3), hy + 5.5, { align: 'center', maxWidth: cols[3] - 4 }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(freq, colCenter(3), hy + 5.5, { align: 'center' }) }

      if (hasUrdu(dur)) { pdf.setFontSize(9); safeUrduText(dur, colCenter(4), hy + 5.5, { align: 'center', maxWidth: cols[4] - 4 }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(dur, colCenter(4), hy + 5.5, { align: 'center' }) }

      if (hasUrdu(instr)) { pdf.setFontSize(9); safeUrduText(instr, colCenter(5), hy + 5.5, { align: 'center', maxWidth: cols[5] - 4 }) }
      else { pdf.setTextColor(muted.r, muted.g, muted.b); POP('normal'); pdf.setFontSize(7); pdf.text(instr, colCenter(5), hy + 5.5, { align: 'center' }) }

      // Hairline row separator
      pdf.setDrawColor(hair.r, hair.g, hair.b)
      pdf.setLineWidth(0.2)
      pdf.line(tableX, hy + rowH, tableX + tableW, hy + rowH)
      hy += rowH
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. FOOTER — bilingual note left | signature right
  // ══════════════════════════════════════════════════════════════════════════
  const footY = H - my - 20
  pdf.setDrawColor(hair.r, hair.g, hair.b)
  pdf.setLineWidth(0.2)
  pdf.line(hx, footY - 3, W - mx - 8, footY - 3)

  // Bilingual note (left)
  POP('normal'); pdf.setFontSize(6.5); pdf.setTextColor(muted.r, muted.g, muted.b)
  pdf.text('This prescription is computer generated. Valid only with doctor signature & hospital stamp.', hx, footY + 2)
  if (urduOk) {
    try {
      pdf.setFontSize(8.5)
      drawUrduText(pdf, 'یہ نسخہ کمپیوٹر سے تیار کیا گیا ہے۔ ڈاکٹر کے دستخط اور ہسپتال مہر کے بغیر درست نہیں۔', W - mx - 8, footY + 9, { align: 'right' })
    } catch { /* silent */ }
  }

  // Signature block (right)
  const sigRX = W - mx - 8
  pdf.setTextColor(ink.r, ink.g, ink.b)
  POP('bold'); pdf.setFontSize(9)
  pdf.text(safe(safeData.doctor?.name), sigRX, footY + 2, { align: 'right' })
  POP('normal'); pdf.setFontSize(7); pdf.setTextColor(muted.r, muted.g, muted.b)
  pdf.text(safe(safeData.doctor?.qualification, ''), sigRX, footY + 7, { align: 'right' })
  pdf.setDrawColor(teal.r, teal.g, teal.b)
  pdf.setLineWidth(0.3)
  pdf.line(sigRX - 48, footY + 14, sigRX, footY + 14)
  pdf.setTextColor(muted.r, muted.g, muted.b)
  POP('normal'); pdf.setFontSize(6)
  pdf.text("Doctor's Signature & Stamp", sigRX - 24, footY + 18, { align: 'center' })

  } catch (err: any) {
    // If anything fails, print error on PDF so user sees it
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(200, 0, 0)
    pdf.text('Error generating prescription: ' + (err?.message || 'Unknown error'), mx + 5, H / 2)
    console.error('Template 11 generation failed:', err)
  }

  return pdf
}
