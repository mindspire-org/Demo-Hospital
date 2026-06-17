import type { PrescriptionPdfData } from './prescriptionPdf'

type RxPdfExtras = {
  tokenNo?: string
  mrn?: string
  computerNo?: string
  outdoorNo?: string
  wo?: string
  fatherName?: string
  clinicalNotes?: string
  investigations?: string
  provisionalDiagnosis?: string
  corporatePanelName?: string
  corporatePreAuthNo?: string
  visitCategory?: string
  isReprint?: boolean
  manualRxFields?: Record<string, boolean>
}

export async function previewHospitalRxPdf(data: PrescriptionPdfData & RxPdfExtras) {
  const { jsPDF } = await import('jspdf')
  const { ensurePoppins } = await import('./prescription/ensurePoppins')
  const { ensureUrduNastaleeq, drawUrduText } = await import('./prescription/ensureUrduNastaleeq')
  const { translateRxItem } = await import('./prescriptionUrdu')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Load Poppins — detect whether it actually registered
  let poppinsOk = false
  try {
    await ensurePoppins(pdf)
    // Probe: setFont throws if font not registered
    pdf.setFont('Poppins', 'normal')
    poppinsOk = true
  } catch { poppinsOk = false }

  // Load Urdu font into browser (for canvas image rendering)
  const urduOk = await ensureUrduNastaleeq(pdf)
  const hasUrdu = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrduText = (text: string, x: number, y: number, opts?: any) => {
    drawUrduText(pdf, text, x, y, opts)
  }

  // Always safe font setter
  const POP = (style: 'normal' | 'bold') => {
    if (poppinsOk) { try { pdf.setFont('Poppins', style); return } catch {} }
    pdf.setFont('helvetica', style)
  }

  // Field visibility helper
  const rawManualRxFields = data.manualRxFields
  const show = (k: string) => !rawManualRxFields || rawManualRxFields[k] !== false

  // Safe splitTextToSize: temporarily switch to helvetica so jsPDF always has metrics
  const safeSplit = (text: string, maxW: number): string[] => {
    const prev = (pdf as any).getFont?.()
    pdf.setFont('helvetica', 'normal')
    const lines = (pdf as any).splitTextToSize(String(text || ''), maxW) as string[]
    try { if (prev) pdf.setFont(prev.fontName, prev.fontStyle) } catch {}
    return lines
  }

  // ── Palette ────────────────────────────────────────────────
  const black     = { r: 0,   g: 0,   b: 0   }
  const navy      = { r: 15,  g: 23,  b: 42  }
  const accent    = { r: 14,  g: 165, b: 233 }  // bright sky blue
  const accentLt  = { r: 240, g: 249, b: 255 }  // very light sky tint
  const white     = { r: 255, g: 255, b: 255 }
  const red       = { r: 185, g: 28,  b: 28  }
  const muted     = { r: 100, g: 116, b: 139 }  // slate-500

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {} as any
  const dt = (() => {
    try {
      const d = data.createdAt ? new Date(data.createdAt as any) : new Date()
      return isNaN(d.getTime()) ? new Date() : d
    } catch { return new Date() }
  })()

  const mx = 14   // margin x
  let y = 0

  // ══════════════════════════════════════════════════════════════
  // HEADER BAND (COMPACT) - Very light background, black text
  // ══════════════════════════════════════════════════════════════
  const hdrH = 28
  pdf.setFillColor(accentLt.r, accentLt.g, accentLt.b)
  pdf.rect(0, 0, W, hdrH, 'F')

  // Logo
  const logo = String((settings as any).logoDataUrl || '')
  let textCenterOffset = 0
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      pdf.addImage(normalized, 'PNG' as any, mx, 6, 20, 20, undefined, 'FAST')
      textCenterOffset = 0   // still center on full width
    } catch {}
  }
  void textCenterOffset

  // Hospital name - black text
  POP('bold')
  pdf.setFontSize(16)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text(String(settings.name || 'Hospital'), W / 2, 12, { align: 'center' })

  // Address · phone - black text
  POP('normal')
  pdf.setFontSize(7)
  pdf.setTextColor(60, 60, 70)
  const subLine = [settings.address, settings.phone ? `PH: ${settings.phone}` : ''].filter(Boolean).join('   ·   ')
  if (subLine) pdf.text(subLine, W / 2, 18, { align: 'center' })

  // Accent rule below header
  pdf.setFillColor(125, 211, 252)
  pdf.rect(0, hdrH, W, 0.6, 'F')

  y = hdrH + 4

  // ══════════════════════════════════════════════════════════════
  // DOCTOR BLOCK
  // ══════════════════════════════════════════════════════════════
  const docName = show('doctorName') && doctor.name ? `Dr ${String(doctor.name)}` : ''
  const docQual = show('qualification') && doctor.qualification ? String(doctor.qualification) : ''
  const docSpec = doctor.specialization ? String(doctor.specialization) : ''
  const docDept = show('departmentName') && doctor.departmentName ? String(doctor.departmentName) : ''

  if (docName || docQual || docSpec || docDept) {
    pdf.setTextColor(navy.r, navy.g, navy.b)
    POP('bold')
    pdf.setFontSize(10)
    if (docName) { pdf.text(docName, mx, y); y += 5 }
    POP('normal')
    pdf.setFontSize(8)
    pdf.setTextColor(muted.r, muted.g, muted.b)
    const docSub = [docQual, docSpec, docDept].filter(Boolean).join('  ·  ')
    if (docSub) { pdf.text(docSub, mx, y); y += 4.5 }
    y += 2
  }

  // Thin rule
  pdf.setDrawColor(210, 220, 235)
  pdf.setLineWidth(0.3)
  pdf.line(mx, y, W - mx, y)
  y += 3

  // ══════════════════════════════════════════════════════════════
  // PATIENT INFO BAND — light tinted background, two columns
  // ══════════════════════════════════════════════════════════════
  const dtStr = dt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const fatherVal  = String(data.fatherName || patient.fatherName || '-')
  const nameVal    = String(patient.name  || '-').toUpperCase()
  const ageVal     = `${String(patient.age || '')}${patient.age ? ' Yr' : ''}  ${String(patient.gender || '')}`.trim()
  const mrnVal     = String(data.mrn || (patient as any).mrn || '-')
  const addressVal = String(patient.address || '-')
  const phoneVal   = String(patient.phone || '-')
  const cnicVal    = String((patient as any).cnic || '-')
  const tokenVal   = String(data.tokenNo || data.outdoorNo || '')
  const catVal     = data.visitCategory
    ? (String(data.visitCategory).toLowerCase() === 'private' ? 'Private' : 'General')
    : ''

  // Left col  = mx … (W/2 - 4),  Right col = W/2 + 4 … W - mx
  const halfW  = (W - mx * 2 - 10) / 2
  const lx     = mx
  const rx2    = mx + halfW + 10
  const rowH   = 6
  const labelFs = 6.5
  const valueFs = 8

  // Compact patient info - all fields in 3 rows (respecting manualRxFields from settings)
  const rows: Array<[string, string, string, string]> = []

  // Row 1: Patient Name + Father | MR No + Token No
  const nameFather = [nameVal, show('fatherName') ? fatherVal : ''].filter(Boolean).join(' S/O ')
  const mrToken = [show('mrn') ? mrnVal : '', show('tokenNo') ? tokenVal : ''].filter(Boolean).join(' · ')
  if (show('patientName')) rows.push(['Name', nameFather, 'MR / Token', mrToken || '-'])

  // Row 2: Age/Gender | Phone + Date
  const ageGender = [show('age') ? patient.age : '', show('gender') ? patient.gender : ''].filter(Boolean).join(' / ')
  const phoneDate = [show('phone') ? phoneVal : '', show('dateTime') ? dtStr.split(',')[0] : ''].filter(Boolean).join(' · ')
  if (show('age') || show('gender')) rows.push(['Age / Gender', ageGender || '-', 'Phone / Date', phoneDate || '-'])

  // Row 3: Address | CNIC + Token Type
  const addrVal = show('address') ? addressVal : ''
  const cnicType = [show('cnic') ? cnicVal : '', catVal].filter(Boolean).join(' · ')
  if (show('address') || show('cnic') || catVal) rows.push(['Address', addrVal || '-', 'CNIC / Type', cnicType || '-'])

  const bandPadT = 2
  const bandPadB = 2
  const bandH = bandPadT + rows.length * rowH + bandPadB

  // Patient info band - no background tint (clean look), no side accent bar

  let ry = y + bandPadT

  // Helper: draw one label+value pair in a column
  const cell = (label: string, value: string, cx: number, cy: number, colW: number) => {
    POP('normal')
    pdf.setFontSize(labelFs)
    pdf.setTextColor(muted.r, muted.g, muted.b)
    pdf.text(label, cx, cy)

    POP('bold')
    pdf.setFontSize(valueFs)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    // clip value to column width
    const maxValW = colW - 2
    const valStr  = String(value || '')
    const valLines = safeSplit(valStr, maxValW)
    pdf.text(valLines[0] || '', cx, cy + 2.8)

  }

  for (const [lLabel, lVal, rLabel, rVal] of rows) {
    cell(lLabel, lVal, lx + 3, ry, halfW)
    if (rLabel) cell(rLabel, rVal, rx2, ry, halfW)
    ry += rowH
  }

  // Token No pill — right-aligned, vertically centred in band
  if (tokenVal && show('tokenNo')) {
    const pillW = 22
    const pillH = 12
    const pillX = W - mx - pillW - 2
    const pillY = y + (bandH - pillH) / 2 - 2
    pdf.setFillColor(accent.r, accent.g, accent.b)
    pdf.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'F')
    POP('bold')
    pdf.setFontSize(9)
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.text('Token', pillX + pillW / 2, pillY + 4, { align: 'center' })
    pdf.setFontSize(10)
    pdf.text(tokenVal, pillX + pillW / 2, pillY + 9.5, { align: 'center' })
  }

  y += bandH + 3

  // ══════════════════════════════════════════════════════════════
  // MAIN CONTENT — two columns
  // ══════════════════════════════════════════════════════════════
  pdf.setDrawColor(navy.r, navy.g, navy.b)
  pdf.setLineWidth(0.5)
  pdf.line(mx, y, W - mx, y)
  y += 4

  const contentTop  = y
  const leftColW    = 38
  const colGap      = 4
  const rightColX   = mx + leftColW + colGap
  const rightColW   = W - mx - rightColX
  const contentH    = H - y - 22

  // Vertical divider
  pdf.setDrawColor(210, 220, 235)
  pdf.setLineWidth(0.4)
  pdf.line(rightColX - colGap / 2, contentTop, rightColX - colGap / 2, contentTop + contentH)

  // ── LEFT: CLINICAL NOTES ──
  let leftY = contentTop + 4
  POP('bold')
  pdf.setFontSize(8)
  pdf.setTextColor(accent.r, accent.g, accent.b)
  pdf.text('CLINICAL NOTES', mx + 2, leftY)
  pdf.setDrawColor(accent.r, accent.g, accent.b)
  pdf.setLineWidth(0.25)
  pdf.line(mx + 2, leftY + 1, mx + 2 + pdf.getTextWidth('CLINICAL NOTES'), leftY + 1)
  leftY += 5

  if (data.clinicalNotes) {
    POP('normal')
    pdf.setFontSize(8)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    const noteLines = safeSplit(String(data.clinicalNotes), leftColW - 6)
    pdf.text(noteLines, mx + 2, leftY)
  }

  // ── RIGHT: Rx SYMBOL + meds ──
  const rxX = rightColX
  const rxY = contentTop + 2

  // Stylised Rₓ
  if (show('showRxSymbol')) {
    POP('bold')
    pdf.setFontSize(28)
    pdf.setTextColor(accent.r, accent.g, accent.b)
    pdf.text('R', rxX + 4, rxY + 13)
    pdf.setFontSize(17)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text('x', rxX + 14, rxY + 13)
  }

  // Medicines with Urdu support
  if (data.items && data.items.length > 0) {
    let my = show('showRxSymbol') ? rxY + 22 : rxY + 4
    const lineH = 5.5
    ;(data.items as any[]).forEach((m: any, i: number) => {
      const name = String(m?.name || '').trim()
      if (!name) return
      const line = `${i + 1}.  ${name}`
      const t = (data as any).language === 'urdu' ? translateRxItem(m, 'urdu') : m
      const parts = [t?.dose, t?.frequency, t?.duration, t?.route, t?.instruction]
        .map((x: any) => String(x || ''))
        .filter((x: any) => x.trim())
      const detail = parts.join('  ·  ')
      const detailHasUrdu = hasUrdu(detail)
      const fullLine = detail ? `${line}  —  ${detail}` : line

      if (detailHasUrdu) {
        // English name on left; each field rendered separately on right
        POP('normal')
        pdf.setFontSize(9.5)
        pdf.setTextColor(navy.r, navy.g, navy.b)
        pdf.text(line, rxX + 4, my)
        let fx = rxX + 4 + pdf.getTextWidth(line) + 6
        let first = true
        const fields = [
          { val: t?.dose },
          { val: t?.frequency },
          { val: t?.duration },
          { val: t?.route },
          { val: t?.instruction },
        ]
        for (const f of fields) {
          const txt = String(f.val || '').trim()
          if (!txt) continue
          if (!first) {
            pdf.text('·', fx, my)
            fx += 4
          }
          first = false
          if (hasUrdu(txt)) {
            const remaining = (rxX + rightColW - 4) - fx
            const slotW = Math.min(remaining, 28)
            safeUrduText(txt, fx + slotW - 1, my, { align: 'right', maxWidth: slotW - 2 })
            fx += slotW + 2
          } else {
            pdf.text(txt, fx, my)
            fx += pdf.getTextWidth(txt) + 3
          }
        }
      } else if (hasUrdu(fullLine)) {
        safeUrduText(fullLine, rxX + rightColW - 4, my, { align: 'right', maxWidth: rightColW - 8 })
      } else {
        POP('normal')
        pdf.setFontSize(9.5)
        pdf.setTextColor(navy.r, navy.g, navy.b)
        const lines = safeSplit(fullLine, rightColW - 8)
        pdf.text(lines, rxX + 4, my)
        my += (lines.length - 1) * 3.5
      }
      my += lineH
    })
  }

  // ══════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════
  const footerY = H - 16
  pdf.setFillColor(accent.r, accent.g, accent.b)
  pdf.rect(0, footerY - 1, W, 0.8, 'F')

  POP('normal')
  pdf.setFontSize(8)
  pdf.setTextColor(black.r, black.g, black.b)
  const footerLine = [settings.address, settings.phone ? `PH: ${settings.phone}` : ''].filter(Boolean).join('   ·   ')
  pdf.text(footerLine || '', W / 2, footerY + 5, { align: 'center' })

  // Preview
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      await api.printPreviewPdf(pdf.output('datauristring') as string)
      return
    }
  } catch {}

  window.open(URL.createObjectURL(pdf.output('blob') as Blob), '_blank')
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width || 200
          canvas.height = img.naturalHeight || img.height || 200
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0)
          const out = canvas.toDataURL('image/png')
          resolve(out || src)
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return src }
}
