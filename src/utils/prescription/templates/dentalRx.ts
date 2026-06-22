// Dental department prescription PDF. Renders the standard header / patient /
// medicines layout plus a tooth-condition summary table. Pattern mirrors
// hospitalRxPdf.ts so it stays visually consistent with the other templates.

const CONDITION_RGB: Record<string, [number, number, number]> = {
  'Sound':      [220, 252, 231],
  'Decay':      [253, 230, 138],
  'Filling':    [191, 219, 254],
  'Crown':      [254, 240, 138],
  'Root Canal': [221, 214, 254],
  'Extracted':  [254, 202, 202],
  'Missing':    [229, 231, 235],
  'Implant':    [153, 246, 228],
  'Fracture':   [253, 186, 116],
  'Abscess':    [251, 207, 232],
  'Calculus':   [214, 195, 165],
  'Mobility':   [199, 210, 254],
  'Other':      [226, 232, 240],
}

export async function previewDentalRxPdf(data: any) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const teal   = { r: 14,  g: 165, b: 183 } // cyan-600-ish (dental accent)
  const tealDk = { r: 12,  g: 110, b: 122 }
  const navy   = { r: 45,  g: 55,  b: 72  }
  const gray   = { r: 130, g: 145, b: 165 }
  const border = { r: 226, g: 232, b: 240 }
  const rowAlt = { r: 248, g: 250, b: 252 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt) : new Date()
  const mx = 10
  const cw = W - 2 * mx

  // ── Header band ──
  const hdrH = 22
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.rect(mx, 2, cw, hdrH, 'F')
  let logoEndX = mx + 4
  if (settings.logoDataUrl) {
    try { pdf.addImage(settings.logoDataUrl, 'PNG', mx + 4, 5, 12, 12, undefined, 'FAST'); logoEndX = mx + 18 } catch {}
  }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255)
  pdf.text(String(settings.name || 'Hospital'), logoEndX + 2, 11)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(230, 245, 247)
  pdf.text('DENTAL DEPARTMENT', logoEndX + 2, 16)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  if (addrPhone) pdf.text(addrPhone, logoEndX + 2, 20)
  const drX = W - mx - 4
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255)
  pdf.text(`Dr. ${String(doctor.name || '-').replace(/^\s*Dr\.?\s*/i, '')}`, drX, 11, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(220, 240, 242)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 16, { align: 'right' })
  const spec = String(doctor.specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 20, { align: 'right' })

  // ── Patient card ──
  const patY = hdrH + 4
  const patH = 16
  pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.3)
  try { pdf.roundedRect(mx, patY, cw, patH, 3, 3) } catch { pdf.rect(mx, patY, cw, patH) }
  pdf.setFillColor(teal.r, teal.g, teal.b); pdf.rect(mx, patY + 2, 3, patH - 4, 'F')
  const pf = (lbl: string, val: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b); pdf.setFontSize(8.5)
    pdf.text(String(val || '-'), x + 13, yy)
  }
  const py1 = patY + 6, py2 = patY + 12
  pf('Patient:', patient.name, mx + 8, py1); pf('MR #:', patient.mrn, mx + 70, py1); pf('Age:', patient.age, mx + 118, py1); pf('Gender:', patient.gender, mx + 152, py1)
  pf('Phone:', patient.phone, mx + 8, py2); pf('Token:', data.tokenNo, mx + 70, py2); pf('Date:', dt.toLocaleDateString('en-GB'), mx + 118, py2)

  let y = patY + patH + 4

  // ── Clinical notes ──
  const sect = (title: string, val?: string) => {
    if (!val || !String(val).trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text(title.toUpperCase(), mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    const lines = pdf.splitTextToSize(String(val).trim(), cw)
    pdf.text(lines, mx, y + 4); y += 4 + lines.length * 3.6 + 2
  }
  sect('Chief Complaint', data.primaryComplaint)
  sect('Diagnosis', data.diagnosis)
  sect('Exam Findings', data.examFindings)

  // ── Dental chart summary table ──
  const teeth = (data.dentalChart?.teeth || []).filter((t: any) => t && t.toothId != null)
  if (teeth.length) {
    y += 1
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(tealDk.r, tealDk.g, tealDk.b)
    pdf.text('DENTAL CHART — TOOTH CONDITIONS', mx, y); y += 3
    pdf.setFillColor(teal.r, teal.g, teal.b); pdf.rect(mx, y, cw, 6, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
    pdf.text('Tooth (FDI)', mx + 3, y + 4)
    pdf.text('Condition', mx + 32, y + 4)
    pdf.text('Notes', mx + 80, y + 4)
    y += 6
    pdf.setFontSize(7.5)
    teeth.sort((a: any, b: any) => Number(a.toothId) - Number(b.toothId)).forEach((t: any, i: number) => {
      const notes = pdf.splitTextToSize(String(t.notes || ''), cw - 82)
      const rowH = Math.max(5, notes.length * 3.4 + 2)
      if (i % 2 === 0) { pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b); pdf.rect(mx, y, cw, rowH, 'F') }
      // condition swatch
      const rgb = CONDITION_RGB[String(t.condition)] || CONDITION_RGB['Other']
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]); pdf.rect(mx + 28, y + 1.4, 2.6, 2.6, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(String(t.toothId), mx + 3, y + 3.6)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(t.condition || '-'), mx + 32, y + 3.6)
      pdf.setTextColor(gray.r, gray.g, gray.b)
      if (notes.length) pdf.text(notes, mx + 80, y + 3.6)
      pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.1); pdf.line(mx, y + rowH, mx + cw, y + rowH)
      y += rowH
    })
    if (data.dentalChart?.generalNotes && String(data.dentalChart.generalNotes).trim()) {
      y += 3; sect('General Dental Notes', data.dentalChart.generalNotes)
    }
    y += 2
  }

  // ── Medicines ──
  drawMedsTable(pdf, data, mx, cw, y, { teal, tealDk, navy, gray, border, rowAlt })

  // ── Footer ──
  drawFooter(pdf, data, W, H, mx, { navy, gray, border })

  await output(pdf)
}

function drawMedsTable(pdf: any, data: any, mx: number, cw: number, startY: number, c: any) {
  const meds = (data.items || []).filter((m: any) => String(m?.name || '').trim())
  if (!meds.length) return
  let y = startY + 2
  pdf.setDrawColor(c.teal.r, c.teal.g, c.teal.b); pdf.setLineWidth(0.4); pdf.line(mx, y, mx + cw, y)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(c.tealDk.r, c.tealDk.g, c.tealDk.b)
  pdf.text('Rx', mx + 2, y + 5)
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal')
  pdf.text('PRESCRIBED MEDICINES', mx + 14, y + 5)
  y += 8
  const cols = [6, 56, 24, 28, 26, 22]
  const hdrs = ['#', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Route']
  pdf.setFillColor(c.teal.r, c.teal.g, c.teal.b); pdf.rect(mx, y - 3, cw, 6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(255, 255, 255)
  let cx = mx + 2
  hdrs.forEach((h, i) => { pdf.text(h, cx, y + 1.5); cx += cols[i] })
  y += 5.5
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(c.navy.r, c.navy.g, c.navy.b)
  meds.forEach((m: any, i: number) => {
    const name = pdf.splitTextToSize(String(m.name || ''), cols[1] - 4)
    const rowH = Math.max(5, name.length * 3.4 + 1.5)
    if (i % 2 === 0) { pdf.setFillColor(c.rowAlt.r, c.rowAlt.g, c.rowAlt.b); pdf.rect(mx, y - 2.5, cw, rowH + 0.5, 'F') }
    cx = mx + 2
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(c.teal.r, c.teal.g, c.teal.b); pdf.text(String(i + 1), cx, y); cx += cols[0]
    pdf.setTextColor(c.navy.r, c.navy.g, c.navy.b); pdf.text(name, cx, y); cx += cols[1]
    pdf.setFont('helvetica', 'normal')
    pdf.text(String(m.dose || ''), cx, y); cx += cols[2]
    pdf.text(String(m.frequency || ''), cx, y); cx += cols[3]
    pdf.text(String(m.duration || ''), cx, y); cx += cols[4]
    pdf.text(String(m.route || ''), cx, y)
    pdf.setDrawColor(c.border.r, c.border.g, c.border.b); pdf.setLineWidth(0.1); pdf.line(mx + 2, y + rowH - 1.5, mx + cw - 2, y + rowH - 1.5)
    y += rowH
  })
}

function drawFooter(pdf: any, data: any, W: number, H: number, mx: number, c: any) {
  const settings = data.settings || {}; const doctor = data.doctor || {}
  const footY = H - 16
  pdf.setDrawColor(c.border.r, c.border.g, c.border.b); pdf.setLineWidth(0.2); pdf.line(mx, footY, mx + 35, footY)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(c.gray.r, c.gray.g, c.gray.b); pdf.text('Signature', mx, footY + 3)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(c.navy.r, c.navy.g, c.navy.b)
  pdf.text(`Dr. ${String(doctor.name || '').replace(/^\s*Dr\.?\s*/i, '')}`, mx, footY + 6.5)
  pdf.setDrawColor(c.border.r, c.border.g, c.border.b); pdf.setLineWidth(0.2); pdf.line(mx, H - 9, W - mx, H - 9)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(c.gray.r, c.gray.g, c.gray.b)
  pdf.text(`${String(settings.name || '')}  ·  ${String(settings.phone || '')}  ·  ${String(settings.address || '')}`, W / 2, H - 5.5, { align: 'center' })
}

async function output(pdf: any) {
  try {
    const { applyOverlayBeforeOutput } = await import('./applyOverlay')
    await applyOverlayBeforeOutput(pdf)
  } catch {}
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') { await api.printPreviewPdf(pdf.output('datauristring')); return }
  } catch {}
  window.open(URL.createObjectURL(pdf.output('blob')), '_blank')
}
