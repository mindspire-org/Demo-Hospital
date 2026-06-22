// Eye department prescription PDF. Renders the standard header / patient /
// medicines layout plus the ophthalmic examination data and a glasses
// prescription table. Pattern mirrors hospitalRxPdf.ts / dentalRx.ts.

export async function previewEyeRxPdf(data: any) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const indigo   = { r: 99,  g: 102, b: 241 } // indigo-500
  const indigoDk = { r: 67,  g: 56,  b: 202 } // indigo-700
  const navy     = { r: 45,  g: 55,  b: 72  }
  const gray     = { r: 130, g: 145, b: 165 }
  const border   = { r: 226, g: 232, b: 240 }
  const rowAlt   = { r: 248, g: 250, b: 252 }
  const c = { teal: indigo, tealDk: indigoDk, navy, gray, border, rowAlt }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt) : new Date()
  const mx = 10
  const cw = W - 2 * mx

  // ── Header band ──
  const hdrH = 22
  pdf.setFillColor(indigo.r, indigo.g, indigo.b); pdf.rect(mx, 2, cw, hdrH, 'F')
  let logoEndX = mx + 4
  if (settings.logoDataUrl) { try { pdf.addImage(settings.logoDataUrl, 'PNG', mx + 4, 5, 12, 12, undefined, 'FAST'); logoEndX = mx + 18 } catch {} }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255)
  pdf.text(String(settings.name || 'Hospital'), logoEndX + 2, 11)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(232, 232, 252)
  pdf.text('EYE DEPARTMENT', logoEndX + 2, 16)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  if (addrPhone) pdf.text(addrPhone, logoEndX + 2, 20)
  const drX = W - mx - 4
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255)
  pdf.text(`Dr. ${String(doctor.name || '-').replace(/^\s*Dr\.?\s*/i, '')}`, drX, 11, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(224, 224, 248)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 16, { align: 'right' })
  const spec = String(doctor.specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 20, { align: 'right' })

  // ── Patient card ──
  const patY = hdrH + 4
  const patH = 16
  pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.3)
  try { pdf.roundedRect(mx, patY, cw, patH, 3, 3) } catch { pdf.rect(mx, patY, cw, patH) }
  pdf.setFillColor(indigo.r, indigo.g, indigo.b); pdf.rect(mx, patY + 2, 3, patH - 4, 'F')
  const pf = (lbl: string, val: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(indigoDk.r, indigoDk.g, indigoDk.b); pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b); pdf.setFontSize(8.5); pdf.text(String(val || '-'), x + 13, yy)
  }
  const py1 = patY + 6, py2 = patY + 12
  pf('Patient:', patient.name, mx + 8, py1); pf('MR #:', patient.mrn, mx + 70, py1); pf('Age:', patient.age, mx + 118, py1); pf('Gender:', patient.gender, mx + 152, py1)
  pf('Phone:', patient.phone, mx + 8, py2); pf('Token:', data.tokenNo, mx + 70, py2); pf('Date:', dt.toLocaleDateString('en-GB'), mx + 118, py2)

  let y = patY + patH + 4
  const eye = data.eyeExamination || {}

  // ── Visual examination table (R/L) ──
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(indigoDk.r, indigoDk.g, indigoDk.b)
  pdf.text('OPHTHALMIC EXAMINATION', mx, y); y += 3
  const exRows: Array<[string, string, string]> = [
    ['Visual Acuity', eye.visualAcuityRight, eye.visualAcuityLeft],
    ['Near Vision', eye.nearVisionRight, eye.nearVisionLeft],
    ['IOP (mmHg)', eye.iopRight, eye.iopLeft],
    ['Refraction', eye.refractionRight, eye.refractionLeft],
  ].map(([l, r, le]) => [l, String(r || ''), String(le || '')]) as Array<[string, string, string]>
  const exCols = [cw * 0.4, cw * 0.3, cw * 0.3]
  pdf.setFillColor(indigo.r, indigo.g, indigo.b); pdf.rect(mx, y, cw, 6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
  pdf.text('Test', mx + 3, y + 4); pdf.text('Right (OD)', mx + exCols[0] + 3, y + 4); pdf.text('Left (OS)', mx + exCols[0] + exCols[1] + 3, y + 4)
  y += 6
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
  exRows.forEach((r, i) => {
    if (i % 2 === 0) { pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b); pdf.rect(mx, y, cw, 6, 'F') }
    pdf.setFont('helvetica', 'bold'); pdf.text(r[0], mx + 3, y + 4)
    pdf.setFont('helvetica', 'normal'); pdf.text(r[1] || '-', mx + exCols[0] + 3, y + 4); pdf.text(r[2] || '-', mx + exCols[0] + exCols[1] + 3, y + 4)
    pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.1); pdf.line(mx, y + 6, mx + cw, y + 6)
    y += 6
  })
  y += 3

  // ── Slit lamp / fundus / diagnosis ──
  const sect = (title: string, val?: string) => {
    if (!val || !String(val).trim()) return
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(indigoDk.r, indigoDk.g, indigoDk.b); pdf.text(title.toUpperCase(), mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    const lines = pdf.splitTextToSize(String(val).trim(), cw); pdf.text(lines, mx, y + 4); y += 4 + lines.length * 3.6 + 2
  }
  sect('Slit Lamp', eye.slitLamp)
  sect('Fundus', eye.fundus)
  sect('Diagnosis', eye.diagnosis || data.diagnosis)

  // ── Glasses prescription table ──
  const gR = eye.glassesRight || {}, gL = eye.glassesLeft || {}
  const hasGlasses = ['sph', 'cyl', 'axis', 'add'].some(k => (gR as any)[k] || (gL as any)[k])
  if (hasGlasses) {
    y += 1
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(indigoDk.r, indigoDk.g, indigoDk.b)
    pdf.text('GLASSES PRESCRIPTION', mx, y); y += 3
    const gCols = [cw * 0.28, cw * 0.18, cw * 0.18, cw * 0.18, cw * 0.18]
    pdf.setFillColor(indigo.r, indigo.g, indigo.b); pdf.rect(mx, y, cw, 6, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
    ;['Eye', 'SPH', 'CYL', 'AXIS', 'ADD'].forEach((h, i) => {
      let gx = mx + 3; for (let j = 0; j < i; j++) gx += gCols[j]; pdf.text(h, gx, y + 4)
    })
    y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    ;[['Right (OD)', gR], ['Left (OS)', gL]].forEach(([label, g]: any, i: number) => {
      if (i % 2 === 0) { pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b); pdf.rect(mx, y, cw, 6, 'F') }
      const cells = [label, g.sph || '-', g.cyl || '-', g.axis || '-', g.add || '-']
      cells.forEach((cell: string, j: number) => {
        let gx = mx + 3; for (let k = 0; k < j; k++) gx += gCols[k]
        if (j === 0) pdf.setFont('helvetica', 'bold'); else pdf.setFont('helvetica', 'normal')
        pdf.text(String(cell), gx, y + 4)
      })
      pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.1); pdf.line(mx, y + 6, mx + cw, y + 6)
      y += 6
    })
    y += 2
  }
  if (eye.generalNotes && String(eye.generalNotes).trim()) sect('Eye Notes', eye.generalNotes)

  // ── Medicines ──
  drawMedsTable(pdf, data, mx, cw, y, c)
  drawFooter(pdf, data, W, H, mx, c)
  await output(pdf)
}

function drawMedsTable(pdf: any, data: any, mx: number, cw: number, startY: number, c: any) {
  const meds = (data.items || []).filter((m: any) => String(m?.name || '').trim())
  if (!meds.length) return
  let y = startY + 2
  pdf.setDrawColor(c.teal.r, c.teal.g, c.teal.b); pdf.setLineWidth(0.4); pdf.line(mx, y, mx + cw, y)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(c.tealDk.r, c.tealDk.g, c.tealDk.b)
  pdf.text('Rx', mx + 2, y + 5)
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.text('PRESCRIBED MEDICINES', mx + 14, y + 5)
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
  try { const { applyOverlayBeforeOutput } = await import('./applyOverlay'); await applyOverlayBeforeOutput(pdf) } catch {}
  try { const api = (window as any).electronAPI; if (api && typeof api.printPreviewPdf === 'function') { await api.printPreviewPdf(pdf.output('datauristring')); return } } catch {}
  window.open(URL.createObjectURL(pdf.output('blob')), '_blank')
}
