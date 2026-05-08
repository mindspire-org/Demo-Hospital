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
  tokenNo: string; barcode?: string; createdAt: string; sampleTime?: string; reportingTime?: string; approvedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: LabReportRow[]; interpretation?: string; printedBy?: string; referringConsultant?: string; profileLabel?: string
}

const POPPINS_REGULAR_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'
const POPPINS_BOLD_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf'
let poppinsRegularB64: string | null = null, poppinsBoldB64: string | null = null

function fmtDateTime(iso?: string) { if (!iso || iso === '-') return '-'; try { const d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString() } catch { return String(iso) } }

async function fetchBase64(url: string): Promise<string> {
  const resp = await fetch(url); const buf = await resp.arrayBuffer(); const bytes = new Uint8Array(buf)
  let binary = ''; const chunk = 0x8000; for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk)); return btoa(binary)
}

async function ensurePoppins(doc: any) {
  try { if (!poppinsRegularB64) poppinsRegularB64 = await fetchBase64(POPPINS_REGULAR_URL); if (!poppinsBoldB64) poppinsBoldB64 = await fetchBase64(POPPINS_BOLD_URL) } catch { return }
  try { doc.addFileToVFS('Poppins-Regular.ttf', poppinsRegularB64); doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal'); doc.addFileToVFS('Poppins-SemiBold.ttf', poppinsBoldB64); doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold') } catch {}
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try { if (/^data:image\/(png|jpeg)/i.test(src)) return src; return await new Promise<string>((resolve) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { try { const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth || 200; canvas.height = img.naturalHeight || 200; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png') || src) } catch { resolve(src) } }; img.onerror = () => resolve(src); img.src = src }) } catch { return src }
}

function pickColumns(rows: LabReportRow[]) {
  // Only include rows that have a result value — skip parameters with no value
  const nonEmptyRows = (rows||[]).filter(r => (r.value||'').trim().length > 0)
  const hasPrev = nonEmptyRows.some(r => (r.prevValue||'').trim().length > 0), hasFlag = nonEmptyRows.some(r => (r.flag||'').length > 0), hasComment = nonEmptyRows.some(r => (r.comment||'').trim().length > 0), hasNormal = nonEmptyRows.some(r => (r.normal||'').trim().length > 0), hasUnit = nonEmptyRows.some(r => (r.unit||'').trim().length > 0)
  const head = [['Test', ...(hasNormal?['Reference']:[]), ...(hasUnit?['Unit']:[]), ...(hasPrev?['Previous']:[]), 'Result', ...(hasFlag?['Flag']:[]), ...(hasComment?['Comment']:[])]]
  const body = nonEmptyRows.map(r => [r.test||'', ...(hasNormal?[r.normal||'']:[]), ...(hasUnit?[r.unit||'']:[]), ...(hasPrev?[r.prevValue||'']:[]), r.value||'', ...(hasFlag?[r.flag||'']:[]), ...(hasComment?[r.comment||'']:[])])
  let idx = 1; if (hasNormal) idx++; if (hasUnit) idx++; const idxPrev = hasPrev ? idx++ : -1; const idxResult = idx; const idxFlag = hasFlag ? idx + 1 : -1
  return { head, body, idxPrev, idxFlag, idxResult, nonEmptyRows }
}

function applyWatermark(doc: any, s: any, pageW: number, pageH: number) {
  const wm = String(s?.watermark || '').trim(); if (!wm) return
  const opacity = Number(s?.watermarkOpacity ?? 0.08), angle = Number(s?.watermarkAngle ?? -45)
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { ;(doc as any).setPage(i); doc.saveGraphicsState?.(); doc.setGState?.(new ((doc as any).GState)({ opacity })); doc.setFontSize(60); doc.setTextColor(180,180,180); doc.text(wm, pageW/2, pageH/2, { angle, align: 'center' }); doc.restoreGraphicsState?.() }
}

async function buildRoyalBlueDoc(input: LabReportInput) {
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || 'Laboratory'
  const address = [s?.addressLine1, s?.addressLine2, s?.addressLine3].filter(Boolean).join(', ') || s?.address || '-'
  const phone = s?.phone || '', email = s?.email || '', logo = s?.logoDataUrl || '', reportFooter = s?.reportFooter || ''
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants].filter(c => (c?.name||'').trim()||(c?.degrees||'').trim()||(c?.title||'').trim()).slice(0,3)
  const useCustomHF = !!s?.useCustomHeaderFooter, headerImg = s?.headerImageUrl || '', footerImg = s?.footerImageUrl || ''
  const reportFont = s?.reportFont || 'poppins'

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  if (reportFont === 'poppins') await ensurePoppins(doc)

  const usePoppins = (() => { try { const list = doc.getFontList ? doc.getFontList() : null; return !!(list && (list as any).Poppins) } catch { return false } })()
  let fontName = 'helvetica'
  if (reportFont === 'poppins' && usePoppins) fontName = 'Poppins'; else if (reportFont === 'times') fontName = 'times'; else if (reportFont === 'courier') fontName = 'courier'
  doc.setFont(fontName, 'normal')

  const pageW = 595, pageH = 842, marginX = 36
  let headerEndY = 0

  // ── HEADER: Royal blue gradient band ──
  if (useCustomHF && headerImg) {
    try { const normalized = await ensurePngDataUrl(headerImg); doc.addImage(normalized, 'PNG' as any, marginX, 10, pageW - marginX*2, 90, undefined, 'FAST'); headerEndY = 110 } catch { headerEndY = 0 }
  } else {
    // Deep blue header band
    const bandH = 96
    // Gradient simulation with multiple rects
    for (let i = 0; i < 20; i++) {
      const ratio = i / 20
      const r = Math.round(15 + ratio * 10)
      const g = Math.round(23 + ratio * 35)
      const b = Math.round(42 + ratio * 100)
      doc.setFillColor(r, g, b)
      doc.rect(0, i * (bandH / 20), pageW, bandH / 20 + 1, 'F')
    }

    // Logo in white rounded box
    doc.setFillColor(255, 255, 255); doc.setDrawColor(59, 130, 246); doc.setLineWidth(1)
    doc.roundedRect(marginX + 10, 16, 64, 64, 12, 12, 'FD')
    if (logo) { try { const normalized = await ensurePngDataUrl(logo); doc.addImage(normalized, 'PNG' as any, marginX + 14, 20, 56, 56, undefined, 'FAST') } catch {} }

    // Lab name
    doc.setTextColor(255, 255, 255); doc.setFont(fontName, 'bold'); doc.setFontSize(18)
    doc.text(String(labName).toUpperCase(), marginX + 90, 44)
    doc.setFont(fontName, 'normal'); doc.setFontSize(9); doc.setTextColor(191, 219, 254)
    const contactLine = [address, phone ? `Ph: ${phone}` : '', email].filter(Boolean).join('  |  ')
    doc.text(contactLine, marginX + 90, 62, { maxWidth: pageW - marginX*2 - 120 })
    if (s?.slogan) { doc.setFontSize(8); doc.setTextColor(147, 197, 253); doc.text(String(s.slogan), marginX + 90, 76) }

    // Barcode
    if ((input.barcode||'').trim()) {
      try {
        const png = await makeBarcodeDataUrl(String(input.barcode).trim())
        if (png) {
          const bw = 120, bh = 24, bx = pageW - marginX - bw - 10, by = 50
          doc.setFillColor(255,255,255); doc.roundedRect(bx - 8, by - 8, bw + 16, bh + 24, 8, 8, 'F')
          doc.addImage(png, 'PNG' as any, bx, by, bw, bh, undefined, 'FAST')
          doc.setFont(fontName, 'bold'); doc.setFontSize(8); doc.setTextColor(15,23,42)
          doc.text(String(input.barcode).trim(), bx + bw/2, by + bh + 12, { align: 'center' })
        }
      } catch {}
    }

    // Blue accent line below band
    doc.setFillColor(59, 130, 246); doc.rect(0, bandH, pageW, 3, 'F')
    headerEndY = bandH + 10
  }

  // ── PATIENT INFO: blue-tinted card ──
  const cardY = headerEndY + 4
  doc.setFillColor(239, 246, 255); doc.setDrawColor(191, 219, 254); doc.setLineWidth(0.5)
  doc.roundedRect(marginX, cardY, pageW - marginX*2, 86, 8, 8, 'FD')
  // Blue left accent
  doc.setFillColor(37, 99, 235); doc.roundedRect(marginX, cardY, 5, 86, 4, 0, 'F')

  const col1 = marginX + 18, col2 = marginX + (pageW - marginX*2) * 0.52
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont(fontName, 'bold'); doc.setFontSize(7); doc.setTextColor(59, 130, 246)
    doc.text(label.toUpperCase(), x, yy)
    doc.setFont(fontName, 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42)
    doc.text(String(value || '-'), x, yy + 10)
  }
  drawKV('Patient Name', input.patient.fullName, col1, cardY + 16)
  drawKV('MR No', input.patient.mrn || '-', col2, cardY + 16)
  drawKV('Age / Gender', `${input.patient.age || '-'} / ${input.patient.gender || '-'}`, col1, cardY + 34)
  drawKV('Lab No', input.tokenNo, col2, cardY + 34)
  drawKV('Reg & Sample', fmtDateTime(input.createdAt), col1, cardY + 52)
  drawKV('Ref. Consultant', input.referringConsultant || '-', col2, cardY + 52)
  drawKV('Contact', `${input.patient.address || '-'}${input.patient.phone ? ` · ${input.patient.phone}` : ''}`, col1, cardY + 70)

  const yStart = cardY + 100

  // ── RESULTS TABLE ──
  const { head, body, idxPrev: _idxPrev, idxFlag, idxResult, nonEmptyRows } = pickColumns(input.rows)

  const sections: Record<string, LabReportRow[]> = {}
  const unsectioned: LabReportRow[] = []
  for (const r of nonEmptyRows) { const key = (r as any).sectionKey || ''; if (key) { if (!sections[key]) sections[key] = []; sections[key].push(r) } else unsectioned.push(r) }

  let currentY = yStart
  const drawSectionHeader = (title: string) => {
    const sectionW = pageW - marginX*2
    doc.setFillColor(37, 99, 235); doc.setTextColor(255, 255, 255)
    doc.setFont(fontName, 'bold'); doc.setFontSize(10)
    doc.roundedRect(marginX, currentY, sectionW, 22, 4, 4, 'F')
    doc.text(title.toUpperCase(), marginX + 12, currentY + 15)
    currentY += 26
  }

  const drawTable = (rows: any[][], startY: number) => {
    autoTable(doc, {
      startY, head, body: rows, theme: 'grid',
      styles: { font: fontName, fontSize: 9, cellPadding: 4, lineWidth: 0.3, lineColor: [191,219,254] },
      headStyles: { fillColor: [30, 64, 175], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
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
          const row = input.rows?.[hookData.row.index]; const f = String(row?.flag || '')
          if (f === 'critical' || f === 'critical_low' || f === 'critical_high') hookData.cell.styles.textColor = [190,18,60]
          else if (f === 'abnormal' || f === 'abnormal_low' || f === 'abnormal_high') hookData.cell.styles.textColor = [180,83,9]
        }
      },
    })
    return ((doc as any).lastAutoTable?.finalY || startY) + 8
  }

  for (const [key, secRows] of Object.entries(sections)) {
    if (currentY > pageH - 200) { doc.addPage(); currentY = 40 }
    drawSectionHeader(key)
    const secBody = secRows.map(r => [r.test||'', ...((head[0] as string[]).includes('Reference')?[r.normal||'']:[]), ...((head[0] as string[]).includes('Unit')?[r.unit||'']:[]), ...((head[0] as string[]).includes('Previous')?[r.prevValue||'']:[]), r.value||'', ...((head[0] as string[]).includes('Flag')?[r.flag||'']:[]), ...((head[0] as string[]).includes('Comment')?[r.comment||'']:[])])
    currentY = drawTable(secBody, currentY)
  }
  if (unsectioned.length > 0) {
    if (Object.keys(sections).length > 0) { if (currentY > pageH - 200) { doc.addPage(); currentY = 40 }; drawSectionHeader('Results') }
    currentY = drawTable(body, currentY)
  } else if (Object.keys(sections).length === 0) {
    currentY = drawTable(body, currentY)
  }

  // ── INTERPRETATION: blue-accented eye-catching box ──
  if ((input.interpretation||'').trim()) {
    if (currentY > pageH - 180) { doc.addPage(); currentY = 40 }
    // Blue header bar
    doc.setFillColor(37, 99, 235)
    doc.roundedRect(marginX, currentY, pageW - marginX*2, 26, 6, 6, 'F')
    doc.setFont(fontName, 'bold'); doc.setFontSize(11); doc.setTextColor(255,255,255)
    doc.text('✦  Clinical Interpretation', marginX + 12, currentY + 17)
    currentY += 32

    // Light blue background box
    doc.setFillColor(239, 246, 255); doc.setDrawColor(191, 219, 254); doc.setLineWidth(0.5)
    doc.roundedRect(marginX, currentY, pageW - marginX*2, 20, 0, 0, 'FD')

    const bullets = String(input.interpretation).split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => `  ◆ ${s}`).join('\n')
    autoTable(doc, {
      startY: currentY + 4,
      body: [[{ content: bullets, styles: { font: fontName, fontSize: 9, textColor: [30,58,138] } }]],
      theme: 'plain', styles: { cellPadding: 6 },
      margin: { left: marginX + 8, right: marginX, bottom: 140 },
    })
    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 12
  }

  // ── FOOTER ──
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    ;(doc as any).setPage(i)
    const baseY = pageH - 72

    if (useCustomHF && footerImg) {
      try { const normalized = await ensurePngDataUrl(footerImg); doc.addImage(normalized, 'PNG' as any, marginX, baseY - 20, pageW - marginX*2, 50, undefined, 'FAST') } catch {}
    } else {
      doc.setFillColor(37, 99, 235); doc.rect(0, baseY - 12, pageW, 3, 'F')
      doc.setFont(fontName, 'normal'); doc.setFontSize(7); doc.setTextColor(100,116,139)
      doc.text('System generated report. Verified by laboratory consultant.', pageW/2, baseY, { align: 'center' })
      if (reportFooter) doc.text(reportFooter, pageW/2, baseY + 10, { align: 'center' })
      if (consultantsList.length) {
        const cols = consultantsList.length; const colW = (pageW - marginX*2) / cols
        consultantsList.forEach((c, idx) => {
          const x = marginX + idx * colW + 2; let y = baseY + 22
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

  applyWatermark(doc, s, pageW, pageH)
  return doc
}

export async function downloadLabReportPdfRoyalBlue(input: LabReportInput) { const doc = await buildRoyalBlueDoc(input); doc.save(`LabReport-${input.tokenNo}.pdf`) }

export async function previewLabReportPdfRoyalBlue(input: LabReportInput) {
  const doc = await buildRoyalBlueDoc(input)
  try { const api = (window as any).electronAPI; if (api && typeof api.printPreviewPdf === 'function') { await api.printPreviewPdf(doc.output('datauristring') as string); return } } catch {}
  doc.autoPrint(); const blob = doc.output('blob') as Blob; const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe'); iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  iframe.onload = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch {}; setTimeout(() => { try { URL.revokeObjectURL(url); iframe.remove() } catch {} }, 10000) }
  iframe.src = url; document.body.appendChild(iframe)
}
