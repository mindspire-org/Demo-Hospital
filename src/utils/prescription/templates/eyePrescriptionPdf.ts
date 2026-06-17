import type { PrescriptionPdfData } from '../../prescriptionPdf'

type EyeRxPdfExtras = {
  tokenNo?: string
  tokenType?: string
  mrn?: string
  outdoorNo?: string
  fatherName?: string
  ar?: string
  va?: string
  iop?: string
  ph?: string
  historyExamination?: string
  investigations?: string
  advice?: string
  nextFollowUp?: string
  nextVisit?: string
  isReprint?: boolean
}

export async function previewEyePrescriptionPdf(data: PrescriptionPdfData & EyeRxPdfExtras) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const black = { r: 0, g: 0, b: 0 }
  const lightGray = { r: 200, g: 200, b: 200 }

  const settings = data.settings || {}
  const patient = data.patient || {}
  const dt = data.createdAt ? new Date(data.createdAt as any) : new Date()

  const marginX = 10
  let y = 10

  // ══════════════════════════════════════════════════════════════════════════
  // 1.  HEADER  Logo (70% left) + Contact Info (30% right)
  // ══════════════════════════════════════════════════════════════════════════
  const headerH = 32

  // Header section: 70% for logo, 30% for contact info
  const headerW = W - 2 * marginX
  const logoAreaW = 0.7 * headerW  // 70% for logo
  const infoAreaW = 0.3 * headerW  // 30% for contact info

  // Logo in 70% area (left side) - maintain aspect ratio
  const maxLogoH = 26
  const maxLogoW = logoAreaW
  const logoX = marginX
  const logoY = y + 3
  try {
    const logoDataUrl = settings.logoDataUrl || await loadImageAsDataUrl('/mcv.jpeg')
    if (logoDataUrl) {
      // Create temp image to get natural dimensions
      const img = new Image()
      img.src = logoDataUrl
      const naturalW = img.naturalWidth || 200
      const naturalH = img.naturalHeight || 100
      const aspectRatio = naturalW / naturalH

      // Calculate dimensions that fit within max bounds while maintaining aspect ratio
      let drawW = maxLogoW
      let drawH = drawW / aspectRatio

      // If height exceeds max, scale down
      if (drawH > maxLogoH) {
        drawH = maxLogoH
        drawW = drawH * aspectRatio
      }

      pdf.addImage(logoDataUrl, 'JPEG', logoX, logoY, drawW, drawH)
    }
  } catch {
    // If logo fails to load, continue without it
  }

  // Contact info in 30% area (right side)
  const infoX = marginX + logoAreaW + 2
  let infoY = y + 5

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(black.r, black.g, black.b)

  // Address
  if (settings.address) {
    const addrLines = (pdf as any).splitTextToSize(String(settings.address), infoAreaW - 4)
    pdf.text(addrLines, infoX, infoY)
    infoY += addrLines.length * 4
  }

  // Phone
  if (settings.phone) {
    pdf.text(String(settings.phone), infoX, infoY)
    infoY += 4
  }

  // Email
  if (settings.email) {
    pdf.text(String(settings.email), infoX, infoY)
    infoY += 4
  }

  // Website
  if (settings.website) {
    pdf.text(String(settings.website), infoX, infoY)
    infoY += 4
  }

  y += headerH

  // Separator line
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(1)
  pdf.line(marginX, y, W - marginX, y)
  y += 4

  // ══════════════════════════════════════════════════════════════════════════
  // 2.  PATIENT INFO SECTION (3 columns: Patient/MR/Token, Age/Gender/Date, Phone/Address)
  // ══════════════════════════════════════════════════════════════════════════
  const rowH = 6
  const col1X = marginX
  const col2X = marginX + 65
  const col3X = marginX + 130

  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)

  // Row 1: Patient | MR # | Token (labels bold, values normal)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Patient:', col1X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(patient.name || '').toUpperCase(), col1X + 22, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('MR #:', col2X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(data.mrn || patient.mrn || ''), col2X + 22, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Token:', col3X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(data.tokenNo || ''), col3X + 20, y - 0.5)
  y += rowH

  // Row 2: Age | Gender | Date
  pdf.setFont('helvetica', 'bold')
  pdf.text('Age:', col1X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(patient.age || ''), col1X + 15, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Gender:', col2X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(patient.gender || ''), col2X + 22, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Date:', col3X, y)
  pdf.setFont('helvetica', 'normal')
  const dtStr = dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  pdf.text(dtStr, col3X + 20, y - 0.5)
  y += rowH

  // Row 3: Phone | Address | Token Type
  pdf.setFont('helvetica', 'bold')
  pdf.text('Phone:', col1X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(patient.phone || ''), col1X + 22, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Address:', col2X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(patient.address || ''), col2X + 25, y - 0.5)

  pdf.setFont('helvetica', 'bold')
  pdf.text('Type:', col3X, y)
  pdf.setFont('helvetica', 'normal')
  pdf.text(String(data.tokenType || ''), col3X + 18, y - 0.5)
  y += rowH + 2

  // Main separator line
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.8)
  pdf.line(marginX, y, W - marginX, y)
  y += 8

  // ══════════════════════════════════════════════════════════════════════════
  // 3.  MAIN CONTENT: Two Column Layout
  // ══════════════════════════════════════════════════════════════════════════
  const contentTop = y
  const leftColW = 65
  const gap = 4
  const rightColX = marginX + leftColW + gap
  const rightColW = W - marginX - rightColX
  const contentHeight = H - y - 35 // Leave space for footer

  // Vertical separator line between columns
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.5)
  pdf.line(rightColX - gap / 2, contentTop, rightColX - gap / 2, contentTop + contentHeight)

  // ══════════════════════════════════════════════════════════════════════════
  // 4.  LEFT COLUMN: Eye Measurements and Notes (Exact layout from image)
  // ══════════════════════════════════════════════════════════════════════════
  let leftY = contentTop + 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(black.r, black.g, black.b)

  // AR - lines start right next to text, compact "<" shape
  pdf.setFontSize(9)
  pdf.text('AR', marginX, leftY)
  pdf.setLineWidth(0.3)
  // Lines start at x+10 (close to text) and go to x+18 (short 8mm)
  pdf.line(marginX + 10, leftY - 1, marginX + 18, leftY - 4)
  pdf.line(marginX + 10, leftY + 1, marginX + 18, leftY + 4)
  leftY += 16

  // VA - lines start right next to text, with gap from AR
  pdf.text('VA', marginX, leftY)
  pdf.line(marginX + 10, leftY - 1, marginX + 18, leftY - 4)
  pdf.line(marginX + 10, leftY + 1, marginX + 18, leftY + 4)
  leftY += 18

  // IOP and PH layout matching reference image
  const iopY = leftY
  pdf.setFontSize(10)
  // IOP centered above
  pdf.text('IOP', marginX + 8, iopY)
  // Horizontal line below IOP
  pdf.setLineWidth(0.3)
  pdf.line(marginX + 2, iopY + 2, marginX + 28, iopY + 2)
  // mmHg labels side by side below the line
  pdf.setFontSize(7)
  pdf.text('mmHg', marginX + 2, iopY + 7)
  pdf.text('mmHg', marginX + 18, iopY + 7)
  // Vertical line going down between the two mmHg labels
  pdf.line(marginX + 15, iopY + 2, marginX + 15, iopY + 12)
  
  // PH on the right side with shorter diagonal lines (stops before vertical divider)
  pdf.setFontSize(9)
  pdf.text('PH', marginX + 36, iopY + 2)
  // Shorter diagonal lines that don't extend past the vertical divider
  pdf.line(marginX + 44, iopY + 1, marginX + 52, iopY - 3)
  pdf.line(marginX + 44, iopY + 4, marginX + 52, iopY + 7)
  
  leftY += 18

  // History/Examination
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('History/Examination:', marginX, leftY)
  leftY += 6

  // Blank space for writing (no box)
  if (data.historyExamination) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const lines = (pdf as any).splitTextToSize(String(data.historyExamination), leftColW - 5)
    pdf.text(lines, marginX, leftY + 3)
  }
  leftY += 38

  // Investigations
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Investigations:', marginX, leftY)
  leftY += 6

  // Blank space for writing (no box)
  if (data.investigations) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const lines = (pdf as any).splitTextToSize(String(data.investigations), leftColW - 5)
    pdf.text(lines, marginX, leftY + 3)
  }
  leftY += 38

  // Advice
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Advice:', marginX, leftY)
  leftY += 6

  // Blank space for writing (no box)
  if (data.advice) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    const lines = (pdf as any).splitTextToSize(String(data.advice), leftColW - 5)
    pdf.text(lines, marginX, leftY + 3)
  }
  leftY += 38

  // Next Visit
  const nextVisitStr = data.nextVisit || data.nextFollowUp || ''
  if (nextVisitStr) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(black.r, black.g, black.b)
    pdf.text('Next Visit:', marginX, leftY)
    pdf.setFont('helvetica', 'normal')
    pdf.line(marginX + 25, leftY + 1, marginX + leftColW - 5, leftY + 1)
    pdf.text(String(nextVisitStr), marginX + 27, leftY - 0.5)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5.  RIGHT COLUMN: Rx Section
  // ══════════════════════════════════════════════════════════════════════════
  const rxX = rightColX
  const rxY = contentTop

  // Rx Symbol - Bold black
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(28)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Rx', rxX + 5, rxY + 12)

  // Prescription content
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)

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
  const maxW = rightColW - 15
  const lines = (pdf as any).splitTextToSize(rawRx || ' ', maxW)
  pdf.text(lines, rxX + 5, rxY + 25)

  // ══════════════════════════════════════════════════════════════════════════
  // 6.  FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  const footerY = H - 15

  // Line above footer
  pdf.setDrawColor(black.r, black.g, black.b)
  pdf.setLineWidth(0.5)
  pdf.line(marginX, footerY - 5, W - marginX, footerY - 5)

  // Signature field at bottom right (just before registration text)
  const sigY = footerY - 9
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Signature: ________________', W - marginX - 2, sigY, { align: 'right' })

  // Registration text
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Register and Recognized by:', W / 2, footerY - 2, { align: 'center' })
  pdf.text('Khyber Pakhtunkhwa Health Care Commission', W / 2, footerY + 2, { align: 'center' })

  // NOT VALID FOR COURT
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(lightGray.r, lightGray.g, lightGray.b)
  pdf.text('NOT VALID FOR COURT', W / 2, footerY + 7, { align: 'center' })

  // ══════════════════════════════════════════════════════════════════════════
  // 7.  OUTPUT
  // ══════════════════════════════════════════════════════════════════════════
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

// Helper to load image from public folder
async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
