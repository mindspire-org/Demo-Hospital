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
  pdf.text(safe(safeData.doctor?.name, 'Dr. —'), drX, hy + 4, { align: 'right' })
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
  // 2. PATIENT INFO — single tinted row
  // ══════════════════════════════════════════════════════════════════════════
  hy += 4
  const piH = 18
  pdf.setFillColor(tealBg.r, tealBg.g, tealBg.b)
  pdf.roundedRect(hx, hy, sw - 16, piH, 2.5, 2.5, 'F')

  const dt = safeData.createdAt ? new Date(safeData.createdAt as any) : new Date()
  const dateStr = (() => { try { return dt.toLocaleDateString('en-GB') } catch { return '' } })()

  const piCols = [
    { label: 'PATIENT NAME', val: safe(safeData.patient?.name) },
    { label: 'MR #',         val: safe(safeData.patient?.mrn) },
    { label: 'AGE / GENDER', val: `${safe(safeData.patient?.age)} / ${safe(safeData.patient?.gender)}` },
    { label: 'DATE',         val: dateStr },
    { label: 'CONTACT',      val: safe(safeData.patient?.phone) },
  ]
  const piColW = (sw - 16) / piCols.length
  piCols.forEach((col, i) => {
    const cx = hx + i * piColW + 4
    pdf.setTextColor(teal.r, teal.g, teal.b)
    POP('bold'); pdf.setFontSize(5.5)
    pdf.text(col.label, cx, hy + 5.5)
    pdf.setTextColor(ink.r, ink.g, ink.b)
    POP('bold'); pdf.setFontSize(8)
    pdf.text(col.val, cx, hy + 12)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 3. VITALS PILLS
  // ══════════════════════════════════════════════════════════════════════════
  hy += piH + 5
  const vitals = [
    { label: 'BP',    val: (safeData.vitals?.bloodPressureSys && safeData.vitals?.bloodPressureDia) ? `${safeData.vitals.bloodPressureSys}/${safeData.vitals.bloodPressureDia} mmHg` : '' },
    { label: 'PULSE', val: safeData.vitals?.pulse ? `${safeData.vitals.pulse} bpm` : '' },
    { label: 'TEMP',  val: safeData.vitals?.temperatureC ? `${safeData.vitals.temperatureC}°F` : '' },
    { label: 'RR',    val: safeData.vitals?.respiratoryRate ? `${safeData.vitals.respiratoryRate}/min` : '' },
    { label: 'WT',    val: safeData.vitals?.weightKg ? `${safeData.vitals.weightKg} kg` : '' },
    { label: 'SPO₂',  val: (safeData.vitals as any)?.spo2 ? `${(safeData.vitals as any).spo2}%` : '' },
  ].filter(v => v.val)

  if (vitals.length) {
    const pillH = 10
    const pillGap = 3
    let px = hx
    vitals.forEach(v => {
      pdf.setFont('helvetica', 'normal')
      const labelW = pdf.getStringUnitWidth(v.label) * 6.5 / pdf.internal.scaleFactor
      pdf.setFont('helvetica', 'bold')
      const valW   = pdf.getStringUnitWidth(v.val)   * 8   / pdf.internal.scaleFactor
      const pillW  = Math.max(labelW + valW + 8, 22)
      pdf.setFillColor(hair.r, hair.g, hair.b)
      pdf.roundedRect(px, hy, pillW, pillH, 2, 2, 'F')
      pdf.setTextColor(muted.r, muted.g, muted.b)
      POP('bold'); pdf.setFontSize(6)
      pdf.text(v.label, px + 3, hy + 4.5)
      pdf.setTextColor(ink.r, ink.g, ink.b)
      POP('bold'); pdf.setFontSize(8)
      pdf.text(v.val, px + 3 + labelW + 2, hy + 7)
      px += pillW + pillGap
      if (px > W - mx - 20) { px = hx; hy += pillH + pillGap }
    })
    hy += pillH + 4
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

  // Table header tinted band
  const tableX  = hx
  const tableW  = sw - 16
  const colWs   = [tableW * 0.36, tableW * 0.14, tableW * 0.16, tableW * 0.16, tableW * 0.18]
  const headers = ['MEDICINE', 'DOSE', 'FREQ', 'DURATION', 'INSTRUCTIONS']
  const rowH    = 7.5

  // Header band
  pdf.setFillColor(tealBg.r, tealBg.g, tealBg.b)
  pdf.roundedRect(tableX, hy, tableW, rowH, 1.5, 1.5, 'F')
  let hcx = tableX + 3
  headers.forEach((h, hi) => {
    pdf.setTextColor(teal.r, teal.g, teal.b)
    POP('bold'); pdf.setFontSize(6)
    pdf.text(h, hcx, hy + 4.8)
    hcx += colWs[hi]
  })
  hy += rowH

  // Medicine rows
  const meds = (safeData.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length === 0) {
    // Empty state row
    pdf.setDrawColor(hair.r, hair.g, hair.b)
    pdf.setLineWidth(0.2)
    pdf.line(tableX, hy + rowH, tableX + tableW, hy + rowH)
    hy += rowH + 4
  } else {
    meds.forEach((m, idx) => {
      const name  = String(m?.name || '').trim()
      const dose  = String(m?.dose || '').trim()
      const freq  = String(m?.frequency || '').trim()
      const dur   = String(m?.duration || '').trim()
      const instr = String(m?.instruction || '').trim()

      if (idx % 2 === 1) {
        pdf.setFillColor(250, 252, 251)
        pdf.rect(tableX, hy, tableW, rowH + (instr ? 4 : 0), 'F')
      }

      // Row number
      pdf.setTextColor(muted.r, muted.g, muted.b)
      POP('normal'); pdf.setFontSize(7)
      pdf.text(String(idx + 1), tableX + 1, hy + 5)

      let rcx = tableX + 3 + 4 // slight indent past number
      const nameUrdu = hasUrdu(name)
      if (nameUrdu) {
        pdf.setFontSize(10)
        safeUrduText(name, rcx + colWs[0] - 8, hy + 5.5, { align: 'right' })
      } else {
        pdf.setTextColor(ink.r, ink.g, ink.b)
        POP('bold'); pdf.setFontSize(8.5)
        pdf.text(name, rcx, hy + 5.5)
      }
      rcx += colWs[0]

      // Dose
      if (hasUrdu(dose)) { pdf.setFontSize(9); safeUrduText(dose, rcx + colWs[1] - 2, hy + 5.5, { align: 'right' }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(dose, rcx, hy + 5.5) }
      rcx += colWs[1]

      // Freq
      if (hasUrdu(freq)) { pdf.setFontSize(9); safeUrduText(freq, rcx + colWs[2] - 2, hy + 5.5, { align: 'right' }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(freq, rcx, hy + 5.5) }
      rcx += colWs[2]

      // Duration
      if (hasUrdu(dur)) { pdf.setFontSize(9); safeUrduText(dur, rcx + colWs[3] - 2, hy + 5.5, { align: 'right' }) }
      else { pdf.setTextColor(ink.r, ink.g, ink.b); POP('normal'); pdf.setFontSize(7.5); pdf.text(dur, rcx, hy + 5.5) }
      rcx += colWs[3]

      // Instructions
      if (hasUrdu(instr)) { pdf.setFontSize(9); safeUrduText(instr, rcx + colWs[4] - 2, hy + 5.5, { align: 'right' }) }
      else { pdf.setTextColor(muted.r, muted.g, muted.b); POP('normal'); pdf.setFontSize(7); pdf.text(instr, rcx, hy + 5.5) }

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
