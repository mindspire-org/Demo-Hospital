import type { PrescriptionPdfData } from './hospitalRxPdf'

export async function previewMinimalRxPdf(data: PrescriptionPdfData) {
  const { jsPDF } = await import('jspdf')
  const { ensureUrduNastaleeq, drawUrduText } = await import('../ensureUrduNastaleeq')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const urduOk = await ensureUrduNastaleeq(pdf)
  const hasUrdu = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    drawUrduText(pdf, text, x, y, opts)
  }
  const wantsUrdu = data.language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  // ── PALETTE: Pure monochrome ─────────────────────────────────────────────
  const ink    = { r: 20,  g: 20,  b: 20  }
  const mid    = { r: 80,  g: 80,  b: 80  }
  const light  = { r: 160, g: 160, b: 160 }
  const rule   = { r: 210, g: 210, b: 210 }
  const bg     = { r: 248, g: 248, b: 248 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 14
  const cw = W - 2 * mx

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — minimal typographic header, no background fill
  // ══════════════════════════════════════════════════════════════════════════

  // Thin top rule
  pdf.setDrawColor(ink.r, ink.g, ink.b)
  pdf.setLineWidth(1.2)
  pdf.line(mx, 10, W - mx, 10)

  // Logo
  let nameX = mx
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePng(logoSrc)
      pdf.addImage(norm, 'PNG' as any, mx, 13, 14, 14, undefined, 'FAST')
      nameX = mx + 17
    } catch {}
  }

  // Hospital name — large serif-style bold
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, 20)

  // Address line
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  pdf.text(addrPhone, nameX, 25.5)

  // Doctor block — right aligned
  const drX = W - mx
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, 17, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 22.5, { align: 'right' })
  const spec = String((doctor as any).specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 27, { align: 'right' })

  // Thick + thin double rule
  pdf.setDrawColor(ink.r, ink.g, ink.b)
  pdf.setLineWidth(0.8)
  pdf.line(mx, 31, W - mx, 31)
  pdf.setLineWidth(0.2)
  pdf.line(mx, 33, W - mx, 33)

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PATIENT INFO — single ruled row
  // ══════════════════════════════════════════════════════════════════════════
  let y = 38
  pdf.setFillColor(bg.r, bg.g, bg.b)
  pdf.rect(mx, y - 3.5, cw, 8, 'F')

  const kv = (lbl: string, val: string, x: number, yy: number, lblW = 12) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text(String(val || '-'), x + lblW, yy)
  }

  kv('Patient:', String(patient.name || '-'), mx + 1, y, 14)
  kv('MR:', String(patient.mrn || '-'), mx + 70, y, 8)
  kv('Age:', String(patient.age || '-'), mx + 106, y, 8)
  kv('Gender:', String(patient.gender || '-'), mx + 132, y, 12)
  kv('Date:', dt.toLocaleDateString('en-GB'), mx + 165, y, 9)

  pdf.setDrawColor(rule.r, rule.g, rule.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, y + 3.5, W - mx, y + 3.5)
  y += 10

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TWO-COLUMN BODY
  // ══════════════════════════════════════════════════════════════════════════
  const lw = 46
  const rX = mx + lw + 5
  const rW = cw - lw - 5
  const bodyY = y

  // ── LEFT: Vitals ─────────────────────────────────────────────────────────
  const v = data.vitals || {}
  const vitals = [
    { l: 'BP',    v: v.bloodPressureSys != null && v.bloodPressureDia != null ? `${v.bloodPressureSys}/${v.bloodPressureDia} mmHg` : '' },
    { l: 'Pulse', v: v.pulse != null ? `${v.pulse} bpm` : '' },
    { l: 'Temp',  v: v.temperatureC != null ? `${v.temperatureC} °C` : '' },
    { l: 'RR',    v: v.respiratoryRate != null ? `${v.respiratoryRate}/min` : '' },
    { l: 'SpO2',  v: v.spo2 != null ? `${v.spo2}%` : '' },
    { l: 'Sugar', v: v.bloodSugar != null ? `${v.bloodSugar} mg/dL` : '' },
    { l: 'Wt',    v: v.weightKg != null ? `${v.weightKg} kg` : '' },
    { l: 'Ht',    v: v.heightCm != null ? `${v.heightCm} cm` : '' },
    { l: 'BMI',   v: v.bmi != null ? String(v.bmi) : '' },
    { l: 'AR',    v: String((v as any).ar || '') },
    { l: 'VA',    v: String((v as any).va || '') },
    { l: 'IOP',   v: String((v as any).iop || '') },
  ].filter(x => x.v.trim())

  // Vitals label
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text('VITAL SIGNS', mx, y)
  pdf.setDrawColor(rule.r, rule.g, rule.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, y + 1.5, mx + lw, y + 1.5)
  y += 4.5

  for (const vit of vitals) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(`${vit.l}`, mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text(vit.v, mx + 14, y)
    y += 4.2
  }

  const labTests  = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    y += 2
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
    pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text('INVESTIGATIONS', mx, y)
    pdf.setLineWidth(0.2); pdf.setDrawColor(rule.r, rule.g, rule.b)
    pdf.line(mx, y + 1.5, mx + lw, y + 1.5)
    y += 4.5
    for (const t of [...labTests, ...diagTests]) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(ink.r, ink.g, ink.b)
      const ls = (pdf as any).splitTextToSize(`• ${t}`, lw - 2)
      pdf.text(ls, mx, y); y += ls.length * 3.8
    }
  }
  const leftBottom = y

  // ── RIGHT: Clinical sections ──────────────────────────────────────────────
  let ry = bodyY
  const sect = (title: string, val: string | undefined) => {
    if (!val?.trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
    pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(title.toUpperCase(), rX, ry)
    pdf.setDrawColor(rule.r, rule.g, rule.b)
    pdf.setLineWidth(0.2); pdf.line(rX, ry + 1.5, rX + rW, ry + 1.5)
    ry += 4
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(ink.r, ink.g, ink.b)
    const lines = (pdf as any).splitTextToSize(val.trim(), rW)
    pdf.text(lines, rX, ry)
    ry += lines.length * 4 + 3
  }

  sect('Chief Complaint', data.primaryComplaint)
  sect('Diagnosis', data.diagnosis)
  sect('Medical History', data.history)
  sect('Examination Findings', data.examFindings)
  sect('Allergy History', data.allergyHistory)
  sect('Family History', data.familyHistory)
  sect('Advice / Referral', data.advice)
  sect('Next Follow Up', data.nextFollowUp)

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Rx MEDICINES — numbered list style (no colored table, pure type)
  // ══════════════════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length) {
    y = Math.max(ry, leftBottom) + 6

    // Rx symbol + rule
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(22)
    pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.text('Rx', mx, y + 1)
    pdf.setDrawColor(ink.r, ink.g, ink.b)
    pdf.setLineWidth(0.6)
    pdf.line(mx + 12, y - 3, W - mx, y - 3)
    pdf.setFontSize(8); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text('PRESCRIBED MEDICINES', mx + 14, y + 1)
    y += 6

    // Column headers — light rule style
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(light.r, light.g, light.b)
    pdf.text('#', mx, y)
    pdf.text('Medicine / Drug', mx + 8, y)
    pdf.text('Dose', mx + 78, y)
    pdf.text('Frequency', mx + 100, y)
    pdf.text('Duration', mx + 135, y)
    pdf.text('Route', mx + 162, y)
    pdf.setDrawColor(rule.r, rule.g, rule.b)
    pdf.setLineWidth(0.2); pdf.line(mx, y + 1.5, W - mx, y + 1.5)
    y += 5

    const { translateRxItem } = await import('../../prescriptionUrdu')
    meds.forEach((m, i) => {
      const t = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const name  = String(m?.name || '').trim()
      const dose  = String(t?.dose || '').trim()
      const freq  = String(t?.frequency || '').trim()
      const dur   = String(t?.duration || '').trim()
      const route = String(t?.route || '').trim()
      const instr = String(t?.instruction || '').trim()
      const nameUrdu = hasUrdu(name)
      const instrUrdu = hasUrdu(instr)
      // splitTextToSize must use helvetica to avoid font-metrics crash
      pdf.setFont('helvetica', 'normal')
      const nL    = nameUrdu ? [name] : (pdf as any).splitTextToSize(name, 68) as string[]
      const rowH  = nL.length * 4.2 + (instr ? 3.8 : 0) + 2

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(mid.r, mid.g, mid.b)
      pdf.text(String(i + 1), mx, y)
      if (nameUrdu) {
        pdf.setFontSize(11); pdf.setTextColor(ink.r, ink.g, ink.b)
        safeUrduText(name, W - mx - 8, y, { align: 'right' })
      } else {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(ink.r, ink.g, ink.b)
        pdf.text(nL, mx + 8, y)
      }
      if (instr) {
        if (instrUrdu) {
          pdf.setFontSize(9); pdf.setTextColor(light.r, light.g, light.b)
          safeUrduText(instr, W - mx - 8, y + nL.length * 4.2, { align: 'right' })
        } else {
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(light.r, light.g, light.b)
          pdf.text(instr, mx + 10, y + nL.length * 4.2)
        }
        pdf.setFontSize(8.5)
      }
      pdf.setTextColor(ink.r, ink.g, ink.b)
      if (hasUrdu(dose))  { pdf.setFontSize(9); safeUrduText(dose,  mx + 78 + 18, y, { align: 'right' }) } else { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.text(dose,  mx + 78, y) }
      if (hasUrdu(freq))  { pdf.setFontSize(9); safeUrduText(freq,  mx + 100 + 30, y, { align: 'right' }) } else { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.text(freq,  mx + 100, y) }
      if (hasUrdu(dur))   { pdf.setFontSize(9); safeUrduText(dur,   mx + 135 + 22, y, { align: 'right' }) } else { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.text(dur,   mx + 135, y) }
      if (hasUrdu(route)) { pdf.setFontSize(9); safeUrduText(route, mx + 162 + 20, y, { align: 'right' }) } else { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.text(route, mx + 162, y) }

      pdf.setDrawColor(rule.r, rule.g, rule.b)
      pdf.setLineWidth(0.15); pdf.line(mx, y + rowH - 2.5, W - mx, y + rowH - 2.5)
      y += rowH
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  const footY = H - 14
  pdf.setDrawColor(ink.r, ink.g, ink.b)
  pdf.setLineWidth(0.8); pdf.line(mx, footY, W - mx, footY)
  pdf.setLineWidth(0.2); pdf.line(mx, footY + 1.5, W - mx, footY + 1.5)

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, mx, footY + 5)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text('Signature / Stamp', mx, footY + 9)

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(mid.r, mid.g, mid.b)
  pdf.text(`${String(settings.phone || '')}   ·   ${String(settings.address || '')}`, W - mx, footY + 5, { align: 'right' })
  pdf.setFontSize(6); pdf.setTextColor(light.r, light.g, light.b)
  pdf.text('Not valid for legal/court purposes', W - mx, footY + 9, { align: 'right' })

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
