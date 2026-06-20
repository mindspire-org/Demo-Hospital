import type { PrescriptionPdfData } from './hospitalRxPdf'

function roundedRect(pdf: any, x: number, y: number, w: number, h: number, r: number) {
  try { pdf.roundedRect(x, y, w, h, r, r) } catch { pdf.rect(x, y, w, h) }
}

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
  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 14
  const cw = W - 2 * mx

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER — modern clean header with navy accent
  // ══════════════════════════════════════════════════════════════════════════

  // Navy top accent bar
  pdf.setFillColor(30, 41, 59)
  pdf.rect(mx, 6, cw, 3, 'F')

  // Logo
  let nameX = mx + 2
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePng(logoSrc)
      pdf.addImage(norm, 'PNG' as any, mx + 2, 14, 14, 14, undefined, 'FAST')
      nameX = mx + 19
    } catch {}
  }

  // Hospital name — large bold
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(ink.r, ink.g, ink.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, 24)

  // Address line
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  pdf.text(addrPhone, nameX, 30)

  // Doctor block — right aligned with navy accent
  const drX = W - mx - 4
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(30, 41, 59)
  const drName2 = String(doctor.name || '-').replace(/^\s*Dr\.?\s*/i, '')
  pdf.text(`Dr. ${drName2}`, drX, 22, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(mid.r, mid.g, mid.b)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 27.5, { align: 'right' })
  const spec = String((doctor as any).specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 32, { align: 'right' })

  // Clean bottom rule
  pdf.setDrawColor(200, 200, 210)
  pdf.setLineWidth(0.3)
  pdf.line(mx, 36, W - mx, 36)

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PATIENT INFO — modern card with rounded corners
  // ══════════════════════════════════════════════════════════════════════════
  let y = 42
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(220, 225, 232)
  pdf.setLineWidth(0.3)
  roundedRect(pdf, mx, y - 4, cw, 18, 3)

  // Left navy accent bar
  pdf.setFillColor(30, 41, 59)
  pdf.rect(mx, y - 2, 3, 14, 'F')

  const kv = (lbl: string, val: string, x: number, yy: number, lblW = 12) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(mid.r, mid.g, mid.b)
    pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(ink.r, ink.g, ink.b)
    pdf.setFontSize(8.5)
    pdf.text(String(val || '-'), x + lblW, yy)
  }

  kv('Patient:', String(patient.name || '-'), mx + 8, y + 2, 14)
  kv('MR:', String(patient.mrn || '-'), mx + 76, y + 2, 8)
  kv('Age:', String(patient.age || '-'), mx + 114, y + 2, 8)
  kv('Gender:', String(patient.gender || '-'), mx + 142, y + 2, 12)
  kv('Date:', dt.toLocaleDateString('en-GB'), mx + 174, y + 2, 9)
  kv('Phone:', String(patient.phone || '-'), mx + 8, y + 9, 14)

  y += 18

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

    // Modern column layout
    const cols = [6, 58, 22, 24, 26, 18, 22]
    const cxPos = (idx: number) => {
      let px = mx + 2
      for (let k = 0; k < idx; k++) px += cols[k]
      return px
    }
    const hdrs = isUrdu
      ? ['#', 'دوا', 'خوراک', 'فریکوئنسی', 'مدت', 'طریقہ', 'ہدایت']
      : ['#', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Route', 'Instr']
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(light.r, light.g, light.b)
    hdrs.forEach((h, i) => {
      const center = cxPos(i) + cols[i] / 2
      pdf.text(h, center, y, { align: 'center' })
    })
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

      // Single detail line merging all columns
      const detailParts = [dose, freq, dur, route, instr].filter(Boolean)
      const detailLine = detailParts.join('   |   ')

      pdf.setFont('helvetica', 'normal')
      const nL    = nameUrdu ? [name] : (pdf as any).splitTextToSize(name, cols[1] - 4) as string[]
      const dL    = detailLine ? (pdf as any).splitTextToSize(detailLine, cw - cols[0] - cols[1] - 8) as string[] : []
      const rowH  = nL.length * 4.2 + (dL.length ? dL.length * 3.6 : 0) + 2

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(mid.r, mid.g, mid.b)
      pdf.text(String(i + 1), cxPos(0) + cols[0] / 2, y, { align: 'center' })

      if (nameUrdu) {
        pdf.setFontSize(11); pdf.setTextColor(ink.r, ink.g, ink.b)
        safeUrduText(name, cxPos(1) + cols[1] - 2, y, { align: 'right' })
      } else {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(ink.r, ink.g, ink.b)
        pdf.text(nL, cxPos(1) + 2, y)
      }

      if (dL.length) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(mid.r, mid.g, mid.b)
        const dY = y + nL.length * 4.2
        const isDrtl = hasUrdu(detailLine)
        if (isDrtl) {
          pdf.setFontSize(9); safeUrduText(dL.slice(0, 2).join(' '), W - mx - 4, dY, { align: 'right' })
        } else {
          pdf.text(dL.slice(0, 2), cxPos(2), dY)
        }
      }

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
  const drFoot2 = String(doctor.name || '').replace(/^\s*Dr\.?\s*/i, '')
  pdf.text(`Dr. ${drFoot2}`, mx, footY + 5)
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
