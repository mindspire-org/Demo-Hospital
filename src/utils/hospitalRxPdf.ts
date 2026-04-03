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
}

export async function previewHospitalRxPdf(data: PrescriptionPdfData & RxPdfExtras) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const black = { r: 0, g: 0, b: 0 }
  const slate = { r: 15, g: 23, b: 42 }

  const settings = data.settings || {}
  const patient = data.patient || {}
  const doctor = data.doctor || {} as any
  const dt = data.createdAt ? new Date(data.createdAt as any) : new Date()

  const marginX = 15
  let y = 12

  // === HEADER ===
  // Hospital Name (center, bold, large)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text(String(settings.name || 'SIALKOT MEDICAL COMPLEX'), W / 2, y + 6, { align: 'center' })
  y += 10

  // Doctor info row with logo
  const logo = String((settings as any).logoDataUrl || '')
  const docStartY = y

  // Doctor info on left
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(String(doctor.name ? `Dr ${doctor.name}` : 'Dr Waris Ali Rana'), marginX, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(String(doctor.specialization || ''), marginX, y)
  y += 4
  pdf.text(String(doctor.qualification || ''), marginX, y)
  y += 8

  // Logo on right (if available)
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      pdf.addImage(normalized, 'PNG' as any, W - marginX - 20, docStartY - 5, 18, 18, undefined, 'FAST')
    } catch { }
  }

  // Separator line
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.5)
  pdf.line(marginX, y, W - marginX, y)
  y += 6

  // === PATIENT INFO SECTION ===
  const rowH = 5.5
  const col1X = marginX
  const col2X = marginX + 55
  const col3X = marginX + 110
  const col4X = marginX + 155

  pdf.setFontSize(9)

  // Row 1: Name | Relation | (empty) | MR No | Token No
  // Name
  pdf.setFont('helvetica', 'normal')
  pdf.text('Name', col1X, y)
  pdf.line(col1X + 12, y + 1, col2X - 5, y + 1)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(patient.name || '').toUpperCase(), col1X + 14, y - 0.5)

  // Relation/S/O
  pdf.setFont('helvetica', 'normal')
  pdf.text('S/O', col2X, y)
  pdf.line(col2X + 10, y + 1, col2X + 35, y + 1)
  pdf.text(String(data.fatherName || patient.fatherName || ''), col2X + 12, y - 0.5)
  y += rowH

  // Row 2: Age/Sex | Computer No | Outdoor No
  pdf.setFont('helvetica', 'normal')
  pdf.text('Age /Sex', col1X, y)
  pdf.line(col1X + 18, y + 1, col1X + 50, y + 1)
  pdf.text(`${String(patient.age || '')} Year / ${String(patient.gender || '')}`, col1X + 20, y - 0.5)

  pdf.text('MR No:', col2X + 10, y)
  pdf.line(col2X + 28, y + 1, col2X + 65, y + 1)
  pdf.text(String(data.mrn || patient.mrn || ''), col2X + 30, y - 0.5)

  pdf.text('Token No:', col4X - 10, y)
  pdf.setLineWidth(0.3)
  pdf.circle(col4X + 18, y - 1, 6, 'S')
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(data.tokenNo || data.outdoorNo || ''), col4X + 16, y - 0.5)
  y += rowH

  // Row 3: Address and Date/Time
  pdf.setFont('helvetica', 'normal')
  pdf.text('Address', col1X, y)
  pdf.line(col1X + 15, y + 1, col3X - 10, y + 1)
  pdf.text(String(patient.address || ''), col1X + 17, y - 0.5)

  pdf.text('Date & Time', col3X, y)
  pdf.line(col3X + 22, y + 1, W - marginX, y + 1)
  const dtStr = dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  pdf.text(dtStr, col3X + 24, y - 0.5)
  y += rowH

  // Row 4: Phone and CNIC
  pdf.setFont('helvetica', 'normal')
  pdf.text('Phone', col1X, y)
  pdf.line(col1X + 15, y + 1, col3X - 10, y + 1)
  pdf.text(String(patient.phone || ''), col1X + 17, y - 0.5)

  pdf.text('CNIC', col3X, y)
  pdf.line(col3X + 14, y + 1, W - marginX, y + 1)
  pdf.text(String((patient as any).cnic || ''), col3X + 16, y - 0.5)
  y += 8

  if (data.corporatePanelName || data.corporatePreAuthNo) {
    pdf.setFont('helvetica', 'normal')
    pdf.text('Panel', col1X, y)
    pdf.line(col1X + 11, y + 1, col3X - 10, y + 1)
    pdf.setFont('helvetica', 'bold')
    pdf.text(String(data.corporatePanelName || ''), col1X + 13, y - 0.5)
    if (data.corporatePreAuthNo) {
      pdf.setFont('helvetica', 'normal')
      pdf.text('Pre-Auth #', col3X, y)
      pdf.line(col3X + 20, y + 1, W - marginX, y + 1)
      pdf.setFont('helvetica', 'bold')
      pdf.text(String(data.corporatePreAuthNo || ''), col3X + 22, y - 0.5)
    }
    y += rowH
  }

  // Main separator line
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.5)
  pdf.line(marginX, y, W - marginX, y)
  y += 3

  // === MAIN CONTENT: Two Column Layout ===
  const contentTop = y
  const leftColW = 55
  const gap = 4
  const rightColX = marginX + leftColW + gap
  const rightColW = W - marginX - rightColX
  const contentHeight = H - y - 30 // Leave space for footer

  // Draw vertical separator between columns
  pdf.setLineWidth(0.3)
  pdf.line(rightColX - gap / 2, contentTop, rightColX - gap / 2, contentTop + contentHeight)

  // === LEFT SIDEBAR SECTIONS ===
  let leftY = contentTop + 3

  // 1. CLINICAL NOTES
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const clinicalNotesText = 'CLINICAL NOTES'
  pdf.text(clinicalNotesText, marginX, leftY)
  pdf.setLineWidth(0.2)
  const clinicalNotesW = pdf.getTextWidth(clinicalNotesText)
  pdf.line(marginX, leftY + 1, marginX + clinicalNotesW, leftY + 1)
  leftY += 8

  // Clinical notes content area (blank for writing)
  const clinicalNotesH = 35
  // Print saved notes if any
  if (data.clinicalNotes) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const noteLines = (pdf as any).splitTextToSize(String(data.clinicalNotes), leftColW - 8)
    pdf.text(noteLines, marginX + 1, leftY)
  }
  leftY += clinicalNotesH + 8

  // 2. INVESTIGATIONS
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const investigationsText = 'INVESTIGATIONS'
  pdf.text(investigationsText, marginX, leftY)
  pdf.setLineWidth(0.2)
  const investigationsW = pdf.getTextWidth(investigationsText)
  pdf.line(marginX, leftY + 1, marginX + investigationsW, leftY + 1)
  leftY += 8

  // Investigations content area
  const investigationsH = 50
  // Print saved investigations if any
  if (data.investigations) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const invLines = (pdf as any).splitTextToSize(String(data.investigations), leftColW - 8)
    pdf.text(invLines, marginX + 1, leftY)
  }
  leftY += investigationsH + 8

  // 3. PROVISIONAL DIAGNOSIS
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const provisionalText = 'PROVISIONAL DIAGNOSIS'
  pdf.text(provisionalText, marginX, leftY)
  pdf.setLineWidth(0.2)
  const provisionalW = pdf.getTextWidth(provisionalText)
  pdf.line(marginX, leftY + 1, marginX + provisionalW, leftY + 1)
  leftY += 8

  // Provisional diagnosis content area
  // Print saved diagnosis if any
  if (data.provisionalDiagnosis) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const diagLines = (pdf as any).splitTextToSize(String(data.provisionalDiagnosis), leftColW - 8)
    pdf.text(diagLines, marginX + 1, leftY)
  }

  leftY += 25

  // === RIGHT COLUMN: Rx SECTION ===
  const rxX = rightColX
  const rxY = contentTop
  const rxW = rightColW

  // Rx Symbol - R with x
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(26)
  pdf.setTextColor(black.r, black.g, black.b)
  // Main R
  pdf.text('R', rxX + 5, rxY + 12)
  // x next to R (small gap)
  pdf.setFontSize(16)
  pdf.text('x', rxX + 13, rxY + 12)

  // Prescription content
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(slate.r, slate.g, slate.b)

  const meds = (data.items || [])
    .map((m: any, i: number) => {
      const name = String(m?.name || '').trim()
      if (!name) return ''
      const parts = [m?.frequency, m?.dose, m?.duration, m?.instruction].filter((x: any) => String(x || '').trim())
      return `${i + 1}. ${name}${parts.length ? ' - ' + parts.join(' - ') : ''}`
    })
    .filter(Boolean)
    .join('\n')

  const rawRx = String(meds || '')
  const maxW = rxW - 15
  const lines = (pdf as any).splitTextToSize(rawRx || ' ', maxW)
  pdf.text(lines, rxX + 5, rxY + 25)

  // === FOOTER ===
  const footerY = H - 18

  // Bottom line
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.5)
  pdf.line(marginX, footerY, W - marginX, footerY)

  // Address text
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text(String(settings.address || 'COMMISSIONER ROAD, SIALKOT'), W / 2, footerY + 5, { align: 'center' })

  // Phone if available
  if (settings.phone) {
    pdf.setFontSize(8)
    pdf.text(`PH: ${String(settings.phone)}`, W / 2, footerY + 9, { align: 'center' })
  }

  // Preview via Electron or browser
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = pdf.output('datauristring') as string
      await api.printPreviewPdf(dataUrl)
      return
    }
  } catch { }

  const blob = pdf.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
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
