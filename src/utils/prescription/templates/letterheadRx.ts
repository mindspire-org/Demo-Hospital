import type { PrescriptionPdfData } from './hospitalRxPdf'

export async function previewLetterheadRxPdf(data: PrescriptionPdfData) {
  const { jsPDF } = await import('jspdf')
  const { ensureUrduNastaleeq, drawUrduText } = await import('../ensureUrduNastaleeq')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // ── PALETTE: Classic letterhead (warm cream + deep navy) ─────────────────
  const navy   = { r: 26,  g: 54,  b: 93  }   // deep formal navy
  const gold   = { r: 161, g: 126, b: 54  }   // muted gold accent
  const ink    = { r: 30,  g: 30,  b: 30  }
  const mid    = { r: 90,  g: 90,  b: 110 }
  const cream  = { r: 254, g: 252, b: 246 }
  const crRule = { r: 220, g: 210, b: 185 }   // warm rule
  const white  = { r: 255, g: 255, b: 255 }

  const urduOk = await ensureUrduNastaleeq(pdf)
  const hasUrdu = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    drawUrduText(pdf, text, x, y, opts)
  }
  const wantsUrdu = (data as any).language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 18
  const cw = W - 2 * mx

  // ══════════════════════════════════════════════════════════════════════════
  // 1. LETTERHEAD — classic top band
  // ══════════════════════════════════════════════════════════════════════════

  // Cream page background
  pdf.setFillColor(cream.r, cream.g, cream.b)
  pdf.rect(0, 0, W, H, 'F')

  // Top navy bar
  pdf.setFillColor(navy.r, navy.g, navy.b)
  pdf.rect(0, 0, W, 36, 'F')

  // Gold accent strip at bottom of header
  pdf.setFillColor(gold.r, gold.g, gold.b)
  pdf.rect(0, 36, W, 1.5, 'F')

  // Logo
  let nameX = mx
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePng(logoSrc)
      pdf.addImage(norm, 'PNG' as any, mx, 7, 20, 20, undefined, 'FAST')
      nameX = mx + 24
    } catch {}
  }

  // Hospital name (centered or left with logo)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, 17)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(200, 210, 230)
  pdf.text([settings.address, settings.phone].filter(Boolean).join('   ·   '), nameX, 23)

  // Doctor (right-aligned in header)
  const drX = W - mx
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, 14, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
  pdf.setTextColor(200, 210, 230)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 20, { align: 'right' })
  const spec = String((doctor as any).specialization || doctor.departmentName || '')
  if (spec) {
    pdf.setTextColor(gold.r + 50, gold.g + 50, gold.b + 50)
    pdf.text(spec, drX, 26, { align: 'right' })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PATIENT DETAIL BLOCK — printed form style
  // ══════════════════════════════════════════════════════════════════════════
  let y = 44
  const fldY = y
  const fldH = 17

  // Thin border box
  pdf.setDrawColor(crRule.r, crRule.g, crRule.b)
  pdf.setLineWidth(0.3)
  pdf.rect(mx, fldY, cw, fldH)

  // Vertical dividers
  const c1 = mx + 62, c2 = mx + 112, c3 = mx + 155
  pdf.line(c1, fldY, c1, fldY + fldH)
  pdf.line(c2, fldY, c2, fldY + fldH)
  pdf.line(c3, fldY, c3, fldY + fldH)

  // Horizontal mid divider
  const midDivY = fldY + fldH / 2
  pdf.line(mx, midDivY, W - mx, midDivY)

  // Field labels (small caps feel)
  const lbl = (txt: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(txt.toUpperCase(), x, yy)
  }
  const val = (txt: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text(String(txt || '-'), x, yy)
  }

  lbl('Patient Name', mx + 2, fldY + 3.5)
  val(String(patient.name || '-'), mx + 2, fldY + 7.5)

  lbl('MR Number', c1 + 2, fldY + 3.5)
  val(String(patient.mrn || '-'), c1 + 2, fldY + 7.5)

  lbl('Age / Gender', c2 + 2, fldY + 3.5)
  val(`${patient.age || '-'} / ${patient.gender || '-'}`, c2 + 2, fldY + 7.5)

  lbl('Date', c3 + 2, fldY + 3.5)
  val(dt.toLocaleDateString('en-GB'), c3 + 2, fldY + 7.5)

  // Row 2
  lbl('Father / Guardian', mx + 2, midDivY + 3.5)
  val(String(patient.fatherName || '-'), mx + 2, midDivY + 7.5)

  lbl('Phone', c1 + 2, midDivY + 3.5)
  val(String(patient.phone || '-'), c1 + 2, midDivY + 7.5)

  lbl('Address', c2 + 2, midDivY + 3.5)
  const addrL = (pdf as any).splitTextToSize(String(patient.address || '-'), cw - (c2 - mx) - 4)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(addrL[0] || '-', c2 + 2, midDivY + 7.5)

  y = fldY + fldH + 6

  // ══════════════════════════════════════════════════════════════════════════
  // 3. VITALS — compact inline row (like classic letterhead forms)
  // ══════════════════════════════════════════════════════════════════════════
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
    // Vitals box with subtle background
    pdf.setFillColor(250, 248, 245) // light cream tint
    pdf.setDrawColor(crRule.r, crRule.g, crRule.b)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(mx, y, cw, 10, 1.5, 1.5, 'FD')
    // Vitals label
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text('VITALS', mx + 3, y + 4)
    // Vitals values
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(ink.r, ink.g, ink.b)
    let vitX = mx + 18
    for (const vit of vitalsList) {
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(`${vit.label}:`, vitX, y + 7)
      const labelW = pdf.getStringUnitWidth(`${vit.label}:`) * 8 / pdf.internal.scaleFactor
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(ink.r, ink.g, ink.b)
      // Check for Urdu in vitals value
      const vitValueUrdu = hasUrdu(vit.value)
      if (vitValueUrdu) {
        safeUrduText(vit.value, vitX + labelW + 12, y + 7, { align: 'right' })
      } else {
        pdf.text(vit.value, vitX + labelW + 2, y + 7)
      }
      vitX += labelW + pdf.getStringUnitWidth(vit.value) * 8 / pdf.internal.scaleFactor + 10
    }
    y += 14
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. BODY — single column letter style with ruled lines
  // ══════════════════════════════════════════════════════════════════════════

  // Watermark Rx (behind content)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(160)
  pdf.setTextColor(navy.r, navy.g, navy.b)
  ;(pdf as any).setGState?.((pdf as any).GState?.({ opacity: 0.04 }))
  pdf.text('Rx', W / 2, H / 2 + 20, { align: 'center' })
  ;(pdf as any).setGState?.((pdf as any).GState?.({ opacity: 1 }))

  // Clinical notes in letter body style
  const sect = (title: string, val2: string | undefined) => {
    if (!val2?.trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(title + ':', mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(ink.r, ink.g, ink.b)
    const lines = (pdf as any).splitTextToSize(val2.trim(), cw - 40)
    pdf.text(lines, mx + 42, y)
    // Ruled underline for each line
    pdf.setDrawColor(crRule.r, crRule.g, crRule.b)
    pdf.setLineWidth(0.2)
    for (let i = 0; i < lines.length; i++) {
      pdf.line(mx, y + 2.5 + i * 4.5, W - mx, y + 2.5 + i * 4.5)
    }
    y += lines.length * 4.5 + 3
  }

  sect('Chief Complaint', data.primaryComplaint)
  sect('Diagnosis', data.diagnosis)
  sect('Medical History', data.history)
  sect('Examination Findings', data.examFindings)
  sect('Family History', data.familyHistory)
  sect('Allergy History', data.allergyHistory)
  sect('Advice / Referral', data.advice)
  sect('Next Follow Up', data.nextFollowUp)

  // ══════════════════════════════════════════════════════════════════════════
  // 4. MEDICINES — formal numbered list on ruled lines
  // ══════════════════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y += 3
    // Section heading
    pdf.setFillColor(navy.r, navy.g, navy.b)
    pdf.rect(mx, y - 4, cw, 6, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255)
    pdf.text('Rx', mx + 2, y + 0.5)
    pdf.setFontSize(8)
    pdf.text('PRESCRIPTION', mx + 14, y + 0.5)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
    pdf.setTextColor(200, 210, 230)
    pdf.text(dt.toLocaleDateString('en-GB'), W - mx, y + 0.5, { align: 'right' })
    y += 8

    const { translateRxItem } = await import('../../prescriptionUrdu')
    meds.forEach((m, i) => {
      const t = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const dose  = String(t?.dose || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const dur   = String(t?.duration || '').trim()
      const route = String(t?.route || '').trim()
      const instr = String(t?.instruction || '').trim()

      // Row rule (letterhead paper lines)
      pdf.setDrawColor(crRule.r, crRule.g, crRule.b)
      pdf.setLineWidth(0.2)
      pdf.line(mx, y + 4.5, W - mx, y + 4.5)

      // Number
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(String(i + 1), mx, y)

      // Medicine name — use Urdu font if needed
      const nameUrdu = hasUrdu(name)
      pdf.setFontSize(nameUrdu ? 11 : 10)
      pdf.setTextColor(ink.r, ink.g, ink.b)
      if (nameUrdu) {
        safeUrduText(name, W - mx - 7, y, { align: 'right' })
      } else {
        pdf.setFont('helvetica', 'bold'); pdf.text(name, mx + 7, y)
      }

      // Details (dose / freq / dur / route)
      const detail = [dose, freq, dur, route].filter(Boolean).join('   |   ')
      pdf.setFontSize(8); pdf.setTextColor(mid.r, mid.g, mid.b)
      if (detail) {
        const detailUrdu = hasUrdu(detail)
        if (detailUrdu) { safeUrduText(detail, W - mx - 7, y + 4, { align: 'right' }) }
        else { pdf.setFont('helvetica', 'normal'); pdf.text(detail, mx + 7, y + 4) }
      }
      if (instr) {
        const instrUrdu = hasUrdu(instr)
        if (instrUrdu) { pdf.setFontSize(9); pdf.setTextColor(mid.r, mid.g, mid.b); safeUrduText(instr, W - mx - 7, y + 8, { align: 'right' }) }
        else { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(mid.r, mid.g, mid.b); pdf.text(`Instructions: ${instr}`, mx + 7, y + 8) }
        y += 4
      }
      y += 9
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  const footTop = H - 22
  // Gold top rule
  pdf.setDrawColor(gold.r, gold.g, gold.b)
  pdf.setLineWidth(0.5)
  pdf.line(mx, footTop, W - mx, footTop)

  // Sig
  pdf.setDrawColor(crRule.r, crRule.g, crRule.b)
  pdf.setLineWidth(0.3)
  pdf.line(mx, footTop + 10, mx + 45, footTop + 10)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text('Signature & Stamp', mx, footTop + 13.5)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, mx, footTop + 17.5)

  // Disclaimer
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text('This prescription is valid for pharmacy use only. Not valid for any legal purpose.', W / 2, footTop + 17, { align: 'center' })

  // Navy footer band
  pdf.setFillColor(navy.r, navy.g, navy.b)
  pdf.rect(0, H - 7, W, 7, 'F')
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(200, 210, 230)
  pdf.text(`${String(settings.name || '')}   ·   ${String(settings.phone || '')}   ·   ${String(settings.address || '')}`, W / 2, H - 3, { align: 'center' })

  const { applyOverlayBeforeOutput } = await import('./applyOverlay')
  await applyOverlayBeforeOutput(pdf)

  try {
    const api = (window as any).electronAPI
    if (api?.printPreviewPdf) { await api.printPreviewPdf(pdf.output('datauristring') as string); return }
  } catch {}
  window.open(URL.createObjectURL(pdf.output('blob') as Blob), '_blank')
}

async function ensurePng(src: string): Promise<string> {
  if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
  return new Promise<string>(res => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 200; c.height = img.naturalHeight || 200; c.getContext('2d')?.drawImage(img, 0, 0); res(c.toDataURL('image/png') || src) } catch { res(src) } }
    img.onerror = () => res(src); img.src = src
  })
}
