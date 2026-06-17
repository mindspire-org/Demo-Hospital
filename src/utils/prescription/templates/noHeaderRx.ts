import type { PrescriptionPdfData } from './hospitalRxPdf'

export async function previewNoHeaderRxPdf(data: PrescriptionPdfData) {
  try {
  const { jsPDF } = await import('jspdf')
  const { ensurePoppins } = await import('../ensurePoppins')
  const { ensureUrduNastaleeq, drawUrduText } = await import('../ensureUrduNastaleeq')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  const urduOk = await ensureUrduNastaleeq(pdf)

  // ── PALETTE ──────────────────────────────────────────────────────────────
  const teal    = { r: 15,  g: 118, b: 110 }
  const tealDk  = { r: 13,  g: 94,  b: 88  }
  const tealLt  = { r: 204, g: 241, b: 239 }
  const navy    = { r: 15,  g: 23,  b: 42  }
  const gray    = { r: 100, g: 116, b: 139 }
  const white   = { r: 255, g: 255, b: 255 }
  const faint   = { r: 248, g: 250, b: 252 }
  const border  = { r: 226, g: 232, b: 240 }

  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  const cw = W - 2 * mx

  // ── NO HEADER / NO FOOTER ─────────────────────────────────────────────────
  // Space for pre-printed letterhead (~35mm)
  let y = 35

  // ── PATIENT INFO BOX ─────────────────────────────────────────────────────
  const patY = y
  pdf.setFillColor(faint.r, faint.g, faint.b)
  pdf.rect(mx, patY, cw, 14, 'F')
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.3)
  pdf.rect(mx, patY, cw, 14)

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(String(patient.name || 'Patient'), mx + 4, patY + 6)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`MRN: ${String(patient.mrn || '-')}`, mx + 4, patY + 11)

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`Age: ${String(patient.age || '-')}`, mx + cw * 0.45, patY + 6)
  pdf.text(`Gender: ${String(patient.gender || '-')}`, mx + cw * 0.45, patY + 11)

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`Date: ${dt.toLocaleDateString()}`, mx + cw * 0.8, patY + 6)
  pdf.text(`Time: ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, mx + cw * 0.8, patY + 11)

  // Doctor name (top-right)
  const drX = W - 4
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(teal.r, teal.g, teal.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, patY + 6, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(gray.r, gray.g, gray.b)
  const spec = String((doctor as any).specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, patY + 11, { align: 'right' })

  y = patY + 18

  // ── VITALS ────────────────────────────────────────────────────────────────
  const v = data.vitals || {}
  const vitalsList: Array<{ label: string; value: string }> = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsList.push({ label: 'BP', value: `${v.bloodPressureSys}/${v.bloodPressureDia}` })
  if (v.pulse != null) vitalsList.push({ label: 'Pulse', value: `${v.pulse} bpm` })
  if (v.temperatureC != null) vitalsList.push({ label: 'Temp', value: `${v.temperatureC}°C` })
  if (v.respiratoryRate != null) vitalsList.push({ label: 'RR', value: `${v.respiratoryRate}/min` })
  if (v.bloodSugar != null) vitalsList.push({ label: 'Sugar', value: `${v.bloodSugar} mg/dL` })
  if (v.spo2 != null) vitalsList.push({ label: 'SpO2', value: `${v.spo2}%` })
  if (v.weightKg != null) vitalsList.push({ label: 'Wt', value: `${v.weightKg} kg` })
  if (v.heightCm != null) vitalsList.push({ label: 'Ht', value: `${v.heightCm} cm` })
  if (v.bmi != null) vitalsList.push({ label: 'BMI', value: String(v.bmi) })
  if ((v as any).ar) vitalsList.push({ label: 'AR', value: String((v as any).ar) })
  if ((v as any).va) vitalsList.push({ label: 'VA', value: String((v as any).va) })
  if ((v as any).iop) vitalsList.push({ label: 'IOP', value: String((v as any).iop) })

  if (vitalsList.length) {
    // Compact vitals strip
    pdf.setFillColor(tealLt.r, tealLt.g, tealLt.b)
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(mx, y, cw, 8, 1, 1, 'FD')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text('VITALS', mx + 3, y + 4)
    
    let vitX = mx + 16
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    
    for (const vit of vitalsList.slice(0, 6)) { // Limit to first 6 for compact display
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
      const labelText = `${vit.label}:`
      pdf.text(labelText, vitX, y + 5.5)
      const labelW = pdf.getStringUnitWidth(labelText) * 7 / pdf.internal.scaleFactor
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(vit.value, vitX + labelW + 1, y + 5.5)
      
      vitX += labelW + pdf.getStringUnitWidth(vit.value) * 7 / pdf.internal.scaleFactor + 8
    }
    y += 12
  }

  // ── COMPLAINT / DIAGNOSIS ─────────────────────────────────────────────────
  const drawBlock = (label: string, value: string) => {
    if (!value || !value.trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(label + ':', mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(navy.r, navy.g, navy.b)
    const lines = (pdf as any).splitTextToSize(value, cw - 6)
    pdf.text(lines, mx, y + 5)
    y += 6 + (lines.length - 1) * 3.5
  }

  drawBlock('Primary Complaint', String(data.primaryComplaint || ''))
  drawBlock('History', String(data.history || ''))
  drawBlock('Examination', String(data.examFindings || ''))
  drawBlock('Diagnosis', String(data.diagnosis || ''))

  // ── Rx MEDICINES TABLE ────────────────────────────────────────────────────
  const wantsUrdu = data.language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  const { translateRxItem } = await import('../../prescriptionUrdu')
  const hasUrduChars = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrdu = (text: string, x: number, yy: number, opts?: any) => {
    if (drawUrduText) drawUrduText(pdf, text, x, yy, opts)
    else pdf.text(text, x, yy, opts)
  }

  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y = Math.max(y, patY + 18) + 3

    // Rx header bar
    pdf.setFillColor(teal.r, teal.g, teal.b)
    pdf.rect(mx, y, cw, 7, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(white.r, white.g, white.b)
    pdf.text('Rx', mx + 4, y + 5.5)
    pdf.setFontSize(8)
    const headerText = isUrdu ? 'تجویز کردہ ادویات' : 'PRESCRIBED MEDICINES'
    if (hasUrduChars(headerText)) {
      safeUrdu(headerText, mx + 14, y + 5.5)
    } else {
      pdf.setFont('helvetica', 'normal')
      pdf.text(headerText, mx + 14, y + 5.5)
    }
    y += 9

    const cols = [6, 38, 18, 18, 22, 12, 22]
    const hdrs = isUrdu
      ? ['#', 'Medicine', 'خوراک', 'مدت', 'فریکوئنسی', 'طریقہ', 'ہدایت']
      : ['#', 'Medicine', 'Dose', 'Duration', 'Frequency', 'Route', 'Instr']
    pdf.setFillColor(tealLt.r, tealLt.g, tealLt.b)
    pdf.rect(mx, y - 3, cw, 5.5, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    let cx = mx + 1
    hdrs.forEach((h, i) => {
      if (hasUrduChars(h)) { safeUrdu(h, cx, y + 1) } else { pdf.setFont('helvetica', 'bold'); pdf.text(h, cx, y + 1) }
      cx += cols[i]
    })
    y += 5

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    meds.forEach((m, i) => {
      const t = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const dose  = String(t?.dose || '').trim()
      const dur   = String(t?.duration || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const route = String(t?.route || '').trim()
      const instr = String(t?.instruction || '').trim()
      const nameL = (pdf as any).splitTextToSize(name, cols[1] - 3)
      const rowH  = nameL.length * 4.2 + 2

      if (i % 2 === 0) {
        pdf.setFillColor(250, 252, 252)
        pdf.rect(mx, y - 3, cw, rowH + 1, 'F')
      }

      cx = mx + 1
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(teal.r, teal.g, teal.b)
      pdf.text(String(i + 1), cx, y); cx += cols[0]
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(nameL, cx, y)
      cx += cols[1]
      pdf.setTextColor(navy.r, navy.g, navy.b)
      if (hasUrduChars(dose)) safeUrdu(dose, cx + cols[2] - 1, y, { align: 'right', maxWidth: cols[2] - 2 })
      else { pdf.setFont('helvetica', 'normal'); pdf.text(dose, cx, y) }
      cx += cols[2]
      if (hasUrduChars(dur)) safeUrdu(dur, cx + cols[3] - 1, y, { align: 'right', maxWidth: cols[3] - 2 })
      else { pdf.setFont('helvetica', 'normal'); pdf.text(dur, cx, y) }
      cx += cols[3]
      if (hasUrduChars(freq)) safeUrdu(freq, cx + cols[4] - 1, y, { align: 'right', maxWidth: cols[4] - 2 })
      else { pdf.setFont('helvetica', 'normal'); pdf.text(freq, cx, y) }
      cx += cols[4]
      if (hasUrduChars(route)) safeUrdu(route, cx + cols[5] - 1, y, { align: 'right', maxWidth: cols[5] - 2 })
      else { pdf.setFont('helvetica', 'normal'); pdf.text(route, cx, y) }
      cx += cols[5]
      pdf.setFontSize(6.5); pdf.setTextColor(gray.r, gray.g, gray.b)
      if (hasUrduChars(instr)) safeUrdu(instr, cx + cols[6] - 1, y, { align: 'right', maxWidth: cols[6] - 2 })
      else if (instr) { pdf.setFont('helvetica', 'normal'); pdf.text(instr, cx, y) }
      pdf.setFontSize(8)

      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.15)
      pdf.line(mx, y + rowH - 2, mx + cw, y + rowH - 2)
      y += rowH
    })
  }

  // ── ADVICE / FOLLOW UP ──────────────────────────────────────────────────
  const sect = (label: string, value: string) => {
    if (!value || !value.trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(label + ':', mx, y + 4)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(navy.r, navy.g, navy.b)
    const lines = (pdf as any).splitTextToSize(value, cw - 6)
    pdf.text(lines, mx, y + 9)
    y += 10 + (lines.length - 1) * 3.5
  }

  y += 4
  sect('Advice / Referral', data.advice || '')
  sect('Next Follow Up', data.nextFollowUp || '')

  // ── NO FOOTER (pre-printed paper) ─────────────────────────────────────────
  // Doctor signature line (minimal)
  const signY = H - 18
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.3)
  pdf.line(W - mx - 60, signY, W - mx, signY)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text('Doctor Signature', W - mx, signY + 5, { align: 'right' })

    // Preview
    try {
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewPdf === 'function') {
        await api.printPreviewPdf(pdf.output('datauristring') as string)
        return
      }
    } catch {}

    window.open(URL.createObjectURL(pdf.output('blob') as Blob), '_blank')
  } catch (e: any) {
    console.error('noHeaderRx PDF generation failed:', e)
    alert('Failed to generate Without Header/Footer PDF: ' + (e?.message || 'Unknown error'))
  }
}
