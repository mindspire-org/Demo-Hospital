// Generic department prescription PDF. Renders the standard header / patient /
// medicines layout plus a list of section descriptors (key-value, free text, or
// table) supplied by the department-module registry. One builder serves all
// registry departments (cardiac, breast-onco, omfs, neuro).

type RxSection =
  | { title: string; type: 'kv'; kv: [string, string][] }
  | { title: string; type: 'text'; text: string }
  | { title: string; type: 'table'; table: { headers: string[]; rows: string[][] } }

type DeptRxOptions = { deptLabel: string; accent: [number, number, number]; sections: RxSection[] }

export async function previewDepartmentRxPdf(data: any, opts: DeptRxOptions) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const [ar, ag, ab] = opts.accent
  const accent = { r: ar, g: ag, b: ab }
  const accentDk = { r: Math.round(ar * 0.7), g: Math.round(ag * 0.7), b: Math.round(ab * 0.7) }
  const navy   = { r: 45, g: 55, b: 72 }
  const gray   = { r: 130, g: 145, b: 165 }
  const border = { r: 226, g: 232, b: 240 }
  const rowAlt = { r: 248, g: 250, b: 252 }
  const c = { accent, accentDk, navy, gray, border, rowAlt }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt) : new Date()
  const mx = 10
  const cw = W - 2 * mx
  const bottomLimit = H - 22

  // ── Header band ──
  const hdrH = 22
  pdf.setFillColor(accent.r, accent.g, accent.b); pdf.rect(mx, 2, cw, hdrH, 'F')
  let logoEndX = mx + 4
  if (settings.logoDataUrl) { try { pdf.addImage(settings.logoDataUrl, 'PNG', mx + 4, 5, 12, 12, undefined, 'FAST'); logoEndX = mx + 18 } catch {} }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255)
  pdf.text(String(settings.name || 'Hospital'), logoEndX + 2, 11)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(245, 245, 250)
  pdf.text(opts.deptLabel, logoEndX + 2, 16)
  const addrPhone = [settings.address, settings.phone].filter(Boolean).join('   ·   ')
  if (addrPhone) pdf.text(addrPhone, logoEndX + 2, 20)
  const drX = W - mx - 4
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255)
  pdf.text(`Dr. ${String(doctor.name || '-').replace(/^\s*Dr\.?\s*/i, '')}`, drX, 11, { align: 'right' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(240, 240, 248)
  if (doctor.qualification) pdf.text(String(doctor.qualification), drX, 16, { align: 'right' })
  const spec = String(doctor.specialization || doctor.departmentName || '')
  if (spec) pdf.text(spec, drX, 20, { align: 'right' })

  // ── Patient card ──
  const patY = hdrH + 4
  const patH = 16
  pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.3)
  try { pdf.roundedRect(mx, patY, cw, patH, 3, 3) } catch { pdf.rect(mx, patY, cw, patH) }
  pdf.setFillColor(accent.r, accent.g, accent.b); pdf.rect(mx, patY + 2, 3, patH - 4, 'F')
  const pf = (lbl: string, val: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(accentDk.r, accentDk.g, accentDk.b); pdf.text(lbl, x, yy)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b); pdf.setFontSize(8.5); pdf.text(String(val || '-'), x + 13, yy)
  }
  const py1 = patY + 6, py2 = patY + 12
  pf('Patient:', patient.name, mx + 8, py1); pf('MR #:', patient.mrn, mx + 70, py1); pf('Age:', patient.age, mx + 118, py1); pf('Gender:', patient.gender, mx + 152, py1)
  pf('Phone:', patient.phone, mx + 8, py2); pf('Token:', data.tokenNo, mx + 70, py2); pf('Date:', dt.toLocaleDateString('en-GB'), mx + 118, py2)

  let y = patY + patH + 4

  const ensureSpace = (need: number) => { if (y + need > bottomLimit) { pdf.addPage(); y = 14 } }

  // ── Standard clinical notes (complaint/diagnosis) ──
  const textSection = (title: string, val?: string) => {
    if (!val || !String(val).trim()) return
    const lines = pdf.splitTextToSize(String(val).trim(), cw)
    ensureSpace(6 + lines.length * 3.6)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(accentDk.r, accentDk.g, accentDk.b); pdf.text(title.toUpperCase(), mx, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(lines, mx, y + 4); y += 4 + lines.length * 3.6 + 2
  }
  textSection('Chief Complaint', data.primaryComplaint)

  // ── Department sections ──
  for (const s of opts.sections) {
    ensureSpace(10)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(accentDk.r, accentDk.g, accentDk.b)
    pdf.text(s.title.toUpperCase(), mx, y); y += 2
    pdf.setDrawColor(accent.r, accent.g, accent.b); pdf.setLineWidth(0.3); pdf.line(mx, y, mx + cw, y); y += 4

    if (s.type === 'text') {
      const lines = pdf.splitTextToSize(s.text, cw)
      ensureSpace(lines.length * 3.6)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(navy.r, navy.g, navy.b)
      pdf.text(lines, mx, y); y += lines.length * 3.6 + 3
    } else if (s.type === 'kv') {
      pdf.setFontSize(8)
      for (const [k, val] of s.kv) {
        const lines = pdf.splitTextToSize(String(val), cw - 50)
        ensureSpace(Math.max(4, lines.length * 3.6))
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(accentDk.r, accentDk.g, accentDk.b); pdf.text(`${k}:`, mx, y)
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(navy.r, navy.g, navy.b); pdf.text(lines, mx + 48, y)
        y += Math.max(4, lines.length * 3.6)
      }
      y += 2
    } else if (s.type === 'table') {
      const headers = s.table.headers
      const colW = cw / headers.length
      ensureSpace(6)
      pdf.setFillColor(accent.r, accent.g, accent.b); pdf.rect(mx, y, cw, 6, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
      headers.forEach((h, i) => pdf.text(String(h), mx + i * colW + 2, y + 4))
      y += 6
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(navy.r, navy.g, navy.b)
      s.table.rows.forEach((row, ri) => {
        const cellLines = row.map((cell) => pdf.splitTextToSize(String(cell || ''), colW - 3))
        const rowH = Math.max(5, Math.max(...cellLines.map((l: any) => l.length)) * 3.4 + 1.5)
        ensureSpace(rowH)
        if (ri % 2 === 0) { pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b); pdf.rect(mx, y, cw, rowH, 'F') }
        cellLines.forEach((l: any, ci: number) => pdf.text(l, mx + ci * colW + 2, y + 3.6))
        pdf.setDrawColor(border.r, border.g, border.b); pdf.setLineWidth(0.1); pdf.line(mx, y + rowH, mx + cw, y + rowH)
        y += rowH
      })
      y += 3
    }
  }

  // ── Medicines ──
  drawMedsTable(pdf, data, mx, cw, y, c, ensureSpace, () => y, (ny: number) => { y = ny })

  // ── Footer (last page) ──
  drawFooter(pdf, data, W, H, mx, c)
  await output(pdf)
}

function drawMedsTable(pdf: any, data: any, mx: number, cw: number, startY: number, c: any, ensureSpace: (n: number) => void, getY: () => number, setY: (n: number) => void) {
  const meds = (data.items || []).filter((m: any) => String(m?.name || '').trim())
  if (!meds.length) return
  setY(startY + 2)
  ensureSpace(14)
  let y = getY()
  pdf.setDrawColor(c.accent.r, c.accent.g, c.accent.b); pdf.setLineWidth(0.4); pdf.line(mx, y, mx + cw, y)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(c.accentDk.r, c.accentDk.g, c.accentDk.b)
  pdf.text('Rx', mx + 2, y + 5)
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.text('PRESCRIBED MEDICINES', mx + 14, y + 5)
  y += 8
  const cols = [6, 56, 24, 28, 26, 22]
  const hdrs = ['#', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Route']
  pdf.setFillColor(c.accent.r, c.accent.g, c.accent.b); pdf.rect(mx, y - 3, cw, 6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(255, 255, 255)
  let cx = mx + 2
  hdrs.forEach((h, i) => { pdf.text(h, cx, y + 1.5); cx += cols[i] })
  y += 5.5
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(c.navy.r, c.navy.g, c.navy.b)
  meds.forEach((m: any, i: number) => {
    const name = pdf.splitTextToSize(String(m.name || ''), cols[1] - 4)
    const rowH = Math.max(5, name.length * 3.4 + 1.5)
    setY(y); ensureSpace(rowH); y = getY()
    if (i % 2 === 0) { pdf.setFillColor(c.rowAlt.r, c.rowAlt.g, c.rowAlt.b); pdf.rect(mx, y - 2.5, cw, rowH + 0.5, 'F') }
    cx = mx + 2
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(c.accent.r, c.accent.g, c.accent.b); pdf.text(String(i + 1), cx, y); cx += cols[0]
    pdf.setTextColor(c.navy.r, c.navy.g, c.navy.b); pdf.text(name, cx, y); cx += cols[1]
    pdf.setFont('helvetica', 'normal')
    pdf.text(String(m.dose || ''), cx, y); cx += cols[2]
    pdf.text(String(m.frequency || ''), cx, y); cx += cols[3]
    pdf.text(String(m.duration || ''), cx, y); cx += cols[4]
    pdf.text(String(m.route || ''), cx, y)
    pdf.setDrawColor(c.border.r, c.border.g, c.border.b); pdf.setLineWidth(0.1); pdf.line(mx + 2, y + rowH - 1.5, mx + cw - 2, y + rowH - 1.5)
    y += rowH
  })
  setY(y)
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
