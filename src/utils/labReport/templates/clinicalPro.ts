import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'abnormal'|'abnormal_low'|'abnormal_high'|'critical'|'critical_low'|'critical_high'; comment?: string; sectionKey?: string }

async function makeBarcodeDataUrl(text: string): Promise<string> {
  const value = String(text || '').trim()
  if (!value) return ''
  try {
    const canvas = document.createElement('canvas')
    const mod: any = await import('jsbarcode')
    const JsBarcode: any = (mod && typeof mod === 'function') ? mod : mod?.default
    if (typeof JsBarcode !== 'function') return ''
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, height: 40, margin: 0 })
    return canvas.toDataURL('image/png')
  } catch { return '' }
}

export type LabReportInput = {
  tokenNo: string
  barcode?: string
  createdAt: string
  sampleTime?: string
  reportingTime?: string
  approvedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: LabReportRow[]
  interpretation?: string
  printedBy?: string
  referringConsultant?: string
  profileLabel?: string
}

const POPPINS_REGULAR_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'
const POPPINS_BOLD_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf'
let poppinsRegularB64: string | null = null
let poppinsBoldB64: string | null = null

function fmtDateTime(iso?: string) {
  if (!iso || iso === '-') return '-'
  try { const d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString() } catch { return String(iso) }
}

async function fetchBase64(url: string): Promise<string> {
  const resp = await fetch(url); const buf = await resp.arrayBuffer(); const bytes = new Uint8Array(buf)
  let binary = ''; const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

async function ensurePoppins(doc: any) {
  try {
    if (!poppinsRegularB64) poppinsRegularB64 = await fetchBase64(POPPINS_REGULAR_URL)
    if (!poppinsBoldB64) poppinsBoldB64 = await fetchBase64(POPPINS_BOLD_URL)
  } catch { return }
  try {
    doc.addFileToVFS('Poppins-Regular.ttf', poppinsRegularB64)
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal')
    doc.addFileToVFS('Poppins-SemiBold.ttf', poppinsBoldB64)
    doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold')
  } catch {}
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { try { const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth || 200; canvas.height = img.naturalHeight || 200; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png') || src) } catch { resolve(src) } }
      img.onerror = () => resolve(src); img.src = src
    })
  } catch { return src }
}

function pickColumns(rows: LabReportRow[]) {
  // Only include rows that have a result value — skip parameters with no value
  const nonEmptyRows = (rows||[]).filter(r => (r.value||'').trim().length > 0)
  const hasPrev = nonEmptyRows.some(r => (r.prevValue||'').trim().length > 0)
  const hasFlag = nonEmptyRows.some(r => (r.flag||'').length > 0)
  const hasComment = nonEmptyRows.some(r => (r.comment||'').trim().length > 0)
  const hasNormal = nonEmptyRows.some(r => (r.normal||'').trim().length > 0)
  const hasUnit = nonEmptyRows.some(r => (r.unit||'').trim().length > 0)
  const head = [['Test', ...(hasNormal?['Reference']:[]), ...(hasUnit?['Unit']:[]), ...(hasPrev?['Previous']:[]), 'Result', ...(hasFlag?['Flag']:[]), ...(hasComment?['Comment']:[])]]
  const body = nonEmptyRows.map(r => [r.test||'', ...(hasNormal?[r.normal||'']:[]), ...(hasUnit?[r.unit||'']:[]), ...(hasPrev?[r.prevValue||'']:[]), r.value||'', ...(hasFlag?[r.flag||'']:[]), ...(hasComment?[r.comment||'']:[])])
  let idx = 1; if (hasNormal) idx++; if (hasUnit) idx++
  const idxPrev = hasPrev ? idx++ : -1; const idxResult = idx; const idxFlag = hasFlag ? idx + 1 : -1
  return { head, body, idxPrev, idxFlag, idxResult, nonEmptyRows }
}

function applyWatermark(doc: any, s: any, pageW: number, pageH: number) {
  const wm = String(s?.watermark || '').trim()
  if (!wm) return
  const opacity = Number(s?.watermarkOpacity ?? 0.08)
  const angle = Number(s?.watermarkAngle ?? -45)
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    ;(doc as any).setPage(i)
    doc.saveGraphicsState?.()
    doc.setGState?.(new ((doc as any).GState)({ opacity }))
    doc.setFontSize(60)
    doc.setTextColor(180, 180, 180)
    doc.text(wm, pageW / 2, pageH / 2, { angle, align: 'center' })
    doc.restoreGraphicsState?.()
  }
}

async function buildClinicalProDoc(input: LabReportInput) {
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || 'Laboratory'
  const address = [s?.addressLine1, s?.addressLine2, s?.addressLine3].filter(Boolean).join(', ') || s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const logo = s?.logoDataUrl || ''
  const reportFooter = s?.reportFooter || ''
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants].filter(c => (c?.name||'').trim()||(c?.degrees||'').trim()||(c?.title||'').trim()).slice(0,3)
  const useCustomHF = !!s?.useCustomHeaderFooter
  const headerImg = s?.headerImageUrl || ''
  const footerImg = s?.footerImageUrl || ''
  const reportFont = s?.reportFont || 'poppins'

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  if (reportFont === 'poppins') await ensurePoppins(doc)

  const usePoppins = (() => { try { const list = doc.getFontList ? doc.getFontList() : null; return !!(list && (list as any).Poppins) } catch { return false } })()
  let fontName = 'helvetica'
  if (reportFont === 'poppins' && usePoppins) fontName = 'Poppins'
  else if (reportFont === 'times') fontName = 'times'
  else if (reportFont === 'courier') fontName = 'courier'
  doc.setFont(fontName, 'normal')

  const pageW = 595, pageH = 842, marginX = 40
  let headerEndY = 0

  // ── HEADER ──
  if (useCustomHF && headerImg) {
    try {
      const normalized = await ensurePngDataUrl(headerImg)
      doc.addImage(normalized, 'PNG' as any, marginX, 10, pageW - marginX*2, 90, undefined, 'FAST')
      headerEndY = 110
    } catch { headerEndY = 0 }
  } else {
    // Clinical Pro header: dark navy top bar with gold accent
    const barH = 8
    doc.setFillColor(15, 23, 42) // slate-900
    doc.rect(0, 0, pageW, barH, 'F')
    doc.setFillColor(212, 175, 55) // gold accent
    doc.rect(0, barH, pageW, 3, 'F')

    const hdrY = barH + 18
    // Logo
    if (logo) {
      try {
        const normalized = await ensurePngDataUrl(logo)
        doc.addImage(normalized, 'PNG' as any, marginX, hdrY, 56, 56, undefined, 'FAST')
      } catch {}
    }

    // Lab name & contact
    const textX = logo ? marginX + 70 : marginX
    doc.setFont(fontName, 'bold'); doc.setFontSize(18); doc.setTextColor(15, 23, 42)
    doc.text(String(labName).toUpperCase(), textX, hdrY + 18)
    doc.setFont(fontName, 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105)
    const contactLine = [address, phone ? `Ph: ${phone}` : '', email].filter(Boolean).join('  |  ')
    doc.text(contactLine, textX, hdrY + 34, { maxWidth: pageW - marginX*2 - 100 })
    if (s?.slogan) {
      doc.setFontSize(8); doc.setTextColor(212, 175, 55)
      doc.text(String(s.slogan), textX, hdrY + 48)
    }

    // Barcode on right
    if ((input.barcode||'').trim()) {
      try {
        const png = await makeBarcodeDataUrl(String(input.barcode).trim())
        if (png) { doc.addImage(png, 'PNG' as any, pageW - marginX - 130, hdrY, 120, 28, undefined, 'FAST') }
      } catch {}
    }

    // Thin separator line
    const sepY = hdrY + 60
    doc.setDrawColor(212, 175, 55); doc.setLineWidth(1.5)
    doc.line(marginX, sepY, pageW - marginX, sepY)
    headerEndY = sepY + 10
  }

  // ── PATIENT INFO CARD ──
  const cardY = headerEndY + 4
  doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5)
  doc.roundedRect(marginX, cardY, pageW - marginX*2, 82, 8, 8, 'FD')

  // Gold left accent bar
  doc.setFillColor(212, 175, 55)
  doc.rect(marginX, cardY + 4, 4, 74, 'F')

  const col1 = marginX + 16, col2 = marginX + (pageW - marginX*2) * 0.52
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont(fontName, 'bold'); doc.setFontSize(8); doc.setTextColor(100,116,139)
    doc.text(label + ':', x, yy)
    doc.setFont(fontName, 'normal'); doc.setFontSize(9); doc.setTextColor(15,23,42)
    doc.text(String(value || '-'), x + doc.getTextWidth(label + ':  '), yy)
  }
  drawKV('Patient', input.patient.fullName, col1, cardY + 18)
  drawKV('MR No', input.patient.mrn || '-', col2, cardY + 18)
  drawKV('Age / Gender', `${input.patient.age || '-'} / ${input.patient.gender || '-'}`, col1, cardY + 34)
  drawKV('Lab No', input.tokenNo, col2, cardY + 34)
  drawKV('Reg Date', fmtDateTime(input.createdAt), col1, cardY + 50)
  drawKV('Sample Time', fmtDateTime(input.sampleTime || '-'), col2, cardY + 50)
  drawKV('Ref. Consultant', input.referringConsultant || '-', col1, cardY + 66)
  drawKV('Reporting Time', fmtDateTime(input.reportingTime || '-'), col2, cardY + 66)

  const yStart = cardY + 100

  // ── RESULTS TABLE ──
  const { head, body, idxPrev: _idxPrev, idxFlag, idxResult, nonEmptyRows } = pickColumns(input.rows)

  // Group by sectionKey if present
  const sections: Record<string, LabReportRow[]> = {}
  const unsectioned: LabReportRow[] = []
  for (const r of nonEmptyRows) {
    const key = (r as any).sectionKey || ''
    if (key) { if (!sections[key]) sections[key] = []; sections[key].push(r) }
    else unsectioned.push(r)
  }

  let currentY = yStart

  const drawSectionHeader = (title: string) => {
    doc.setFillColor(15, 23, 42); doc.setTextColor(255, 255, 255)
    doc.setFont(fontName, 'bold'); doc.setFontSize(10)
    const sectionW = pageW - marginX*2
    doc.roundedRect(marginX, currentY, sectionW, 22, 4, 4, 'F')
    doc.text(title.toUpperCase(), marginX + 12, currentY + 15)
    currentY += 26
  }

  const drawTable = (rows: any[][], startY: number) => {
    autoTable(doc, {
      startY,
      head,
      body: rows,
      theme: 'grid',
      styles: { font: fontName, fontSize: 9, cellPadding: 4, lineWidth: 0.3, lineColor: [226,232,240] },
      headStyles: { fillColor: [30, 58, 95], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: marginX, right: marginX, bottom: 140 },
      didParseCell: (hookData: any) => {
        if (hookData.section !== 'body') return
        if (hookData.column.index === idxFlag) {
          const v = String(hookData.cell.raw || '').toLowerCase()
          if (v.includes('critical')) hookData.cell.styles.textColor = [190,18,60]
          else if (v.includes('abnormal')) hookData.cell.styles.textColor = [180,83,9]
          else if (v.includes('normal')) hookData.cell.styles.textColor = [21,128,61]
        }
        if (hookData.column.index === idxResult) {
          const row = input.rows?.[hookData.row.index]
          const f = String(row?.flag || '')
          if (f === 'critical' || f === 'critical_low' || f === 'critical_high') hookData.cell.styles.textColor = [190,18,60]
          else if (f === 'abnormal' || f === 'abnormal_low' || f === 'abnormal_high') hookData.cell.styles.textColor = [180,83,9]
        }
      },
    })
    return ((doc as any).lastAutoTable?.finalY || startY) + 8
  }

  // Draw sectioned groups
  for (const [key, secRows] of Object.entries(sections)) {
    if (currentY > pageH - 200) { doc.addPage(); currentY = 40 }
    drawSectionHeader(key)
    const secBody = secRows.map(r => [r.test||'', ...((head[0] as string[]).includes('Reference')?[r.normal||'']:[]), ...((head[0] as string[]).includes('Unit')?[r.unit||'']:[]), ...((head[0] as string[]).includes('Previous')?[r.prevValue||'']:[]), r.value||'', ...((head[0] as string[]).includes('Flag')?[r.flag||'']:[]), ...((head[0] as string[]).includes('Comment')?[r.comment||'']:[])])
    currentY = drawTable(secBody, currentY)
  }

  // Draw unsectioned rows
  if (unsectioned.length > 0) {
    if (Object.keys(sections).length > 0) {
      if (currentY > pageH - 200) { doc.addPage(); currentY = 40 }
      drawSectionHeader('Results')
    }
    currentY = drawTable(body, currentY)
  } else if (Object.keys(sections).length === 0) {
    currentY = drawTable(body, currentY)
  }

  // ── INTERPRETATION ──
  if ((input.interpretation||'').trim()) {
    if (currentY > pageH - 180) { doc.addPage(); currentY = 40 }
    // Eye-catching interpretation box
    const interpH = 30
    doc.setFillColor(255, 251, 235); doc.setDrawColor(212, 175, 55); doc.setLineWidth(1.5)
    doc.roundedRect(marginX, currentY, pageW - marginX*2, interpH, 6, 6, 'FD')
    // Icon area
    doc.setFillColor(212, 175, 55)
    doc.roundedRect(marginX, currentY, 36, interpH, 6, 0, 'F')
    doc.setFont(fontName, 'bold'); doc.setFontSize(16); doc.setTextColor(255,255,255)
    doc.text('ℹ', marginX + 11, currentY + 21)
    // Title
    doc.setFont(fontName, 'bold'); doc.setFontSize(11); doc.setTextColor(120, 53, 15)
    doc.text('Clinical Interpretation', marginX + 44, currentY + 18)
    currentY += interpH + 6

    const bullets = String(input.interpretation).split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => `  ▸ ${s}`).join('\n')
    autoTable(doc, {
      startY: currentY,
      body: [[{ content: bullets, styles: { font: fontName, fontSize: 9, textColor: [60,50,20] } }]],
      theme: 'plain',
      styles: { cellPadding: 6 },
      margin: { left: marginX + 8, right: marginX, bottom: 140 },
    })
    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10
  }

  // ── FOOTER ──
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    ;(doc as any).setPage(i)
    const baseY = pageH - 72

    if (useCustomHF && footerImg) {
      try { const normalized = await ensurePngDataUrl(footerImg); doc.addImage(normalized, 'PNG' as any, marginX, baseY - 20, pageW - marginX*2, 50, undefined, 'FAST') } catch {}
    } else {
      doc.setDrawColor(212, 175, 55); doc.setLineWidth(1)
      doc.line(marginX, baseY - 8, pageW - marginX, baseY - 8)
      doc.setFont(fontName, 'normal'); doc.setFontSize(7); doc.setTextColor(100,116,139)
      doc.text('System generated report. Verified by laboratory consultant.', pageW/2, baseY, { align: 'center' })
      if (reportFooter) doc.text(reportFooter, pageW/2, baseY + 10, { align: 'center' })

      if (consultantsList.length) {
        const cols = consultantsList.length; const colW = (pageW - marginX*2) / cols
        consultantsList.forEach((c, idx) => {
          const x = marginX + idx * colW + 2; let y = baseY + 24
          doc.setFont(fontName, 'bold'); doc.setFontSize(9); doc.setTextColor(15,23,42)
          if ((c.name||'').trim()) { doc.text(String(c.name), x, y); y += 11 }
          doc.setFont(fontName, 'normal'); doc.setFontSize(8); doc.setTextColor(71,85,105)
          if ((c.degrees||'').trim()) { doc.text(String(c.degrees), x, y); y += 9 }
          doc.setFont(fontName, 'bold'); doc.setFontSize(8); doc.setTextColor(15,23,42)
          if ((c.title||'').trim()) doc.text(String(c.title), x, y)
        })
      }
    }

    doc.setFont(fontName, 'normal'); doc.setFontSize(8); doc.setTextColor(100,116,139)
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 14, { align: 'right' })
  }

  // ── WATERMARK ──
  applyWatermark(doc, s, pageW, pageH)

  return doc
}

export async function downloadLabReportPdfClinicalPro(input: LabReportInput) {
  const doc = await buildClinicalProDoc(input)
  doc.save(`LabReport-${input.tokenNo}.pdf`)
}

export async function previewLabReportPdfClinicalPro(input: LabReportInput) {
  const doc = await buildClinicalProDoc(input)
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = doc.output('datauristring') as string
      await api.printPreviewPdf(dataUrl); return
    }
  } catch {}
  doc.autoPrint()
  const blob = doc.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'
  iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.style.visibility = 'hidden'
  iframe.onload = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch {}; setTimeout(() => { try { URL.revokeObjectURL(url); iframe.remove() } catch {} }, 10000) }
  iframe.src = url; document.body.appendChild(iframe)
}
